const express = require('express');
const router = express.Router();
const Bed = require('../models/Bed');
const Patient = require('../models/Patient');
const OccupancyHistory = require('../models/OccupancyHistory');
const Alert = require('../models/Alert');
const CleaningJob = require('../models/CleaningJob');
const QRCode = require('qrcode');

// Role-based authorization middleware
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
};

// Filter beds based on user role
const filterBedsByRole = (beds, user) => {
  if (user.role === 'admin') {
    return beds;
  }
  if (user.role === 'icu_manager' || user.role === 'ward_staff') {
    return beds.filter(bed => bed.ward === user.ward);
  }
  return beds;
};

// Get all beds with optional filtering
router.get('/', async (req, res) => {
  try {
    const { ward, status, floor, equipmentType } = req.query;
    const query = {};
    
    // Apply role-based filtering
    if (req.user.role === 'icu_manager' || req.user.role === 'ward_staff') {
      query.ward = req.user.ward;
    } else if (ward && ward !== 'All') {
      query.ward = ward;
    }
    
    if (status) query.status = status;
    if (floor) query['location.floor'] = parseInt(floor);
    if (equipmentType) query.equipmentType = equipmentType;
    
    const beds = await Bed.find(query)
      .populate('patientId')
      .sort({ bedNumber: 1 });
    
    res.json(beds);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get available beds
router.get('/available', async (req, res) => {
  try {
    const { ward, equipmentType, urgency } = req.query;
    const query = { status: 'available' };
    
    // Apply role-based filtering
    if (req.user.role === 'icu_manager' || req.user.role === 'ward_staff') {
      query.ward = req.user.ward;
    } else if (ward) {
      query.ward = ward;
    }
    
    if (equipmentType) {
      query.equipmentType = equipmentType;
    }
    
    let beds = await Bed.find(query).sort({ bedNumber: 1 });
    
    // If urgency is high and no beds found
    if (urgency === 'high' && beds.length === 0 && equipmentType) {
      beds = await Bed.find({ 
        status: 'available',
        equipmentType 
      }).sort({ bedNumber: 1 });
    }
    
    if (urgency === 'high' && beds.length === 0) {
      const cleaningBeds = await Bed.find({ 
        status: 'cleaning',
        ...(equipmentType && { equipmentType })
      })
      .sort({ lastCleaned: -1 })
      .limit(5);
      
      res.json({
        available: [],
        alternatives: cleaningBeds,
        message: 'No available beds. These beds are under cleaning and may be ready soon.'
      });
      return;
    }
    
    res.json(beds);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get bed statistics
router.get('/stats', async (req, res) => {
  try {
    let query = {};
    
    // Apply role-based filtering
    if (req.user.role === 'icu_manager' || req.user.role === 'ward_staff') {
      query.ward = req.user.ward;
    }
    
    const totalBeds = await Bed.countDocuments(query);
    const occupied = await Bed.countDocuments({ ...query, status: 'occupied' });
    const available = await Bed.countDocuments({ ...query, status: 'available' });
    const cleaning = await Bed.countDocuments({ ...query, status: 'cleaning' });
    const reserved = await Bed.countDocuments({ ...query, status: 'reserved' });
    const maintenance = await Bed.countDocuments({ ...query, status: 'maintenance' });
    
    // Ward-wise statistics
    const wardStatsQuery = req.user.role === 'icu_manager' || req.user.role === 'ward_staff'
      ? [{ $match: { ward: req.user.ward } }]
      : [];
    
    const wardStats = await Bed.aggregate([
      ...wardStatsQuery,
      {
        $group: {
          _id: '$ward',
          total: { $sum: 1 },
          occupied: {
            $sum: { $cond: [{ $eq: ['$status', 'occupied'] }, 1, 0] }
          },
          available: {
            $sum: { $cond: [{ $eq: ['$status', 'available'] }, 1, 0] }
          },
          cleaning: {
            $sum: { $cond: [{ $eq: ['$status', 'cleaning'] }, 1, 0] }
          }
        }
      },
      { $sort: { _id: 1 } }
    ]);
    
    // Equipment-wise statistics
    const equipmentStats = await Bed.aggregate([
      ...wardStatsQuery,
      {
        $group: {
          _id: '$equipmentType',
          total: { $sum: 1 },
          available: {
            $sum: { $cond: [{ $eq: ['$status', 'available'] }, 1, 0] }
          },
          occupied: {
            $sum: { $cond: [{ $eq: ['$status', 'occupied'] }, 1, 0] }
          }
        }
      },
      { $sort: { _id: 1 } }
    ]);
    
    const occupancyRate = totalBeds > 0 
      ? parseFloat(((occupied / totalBeds) * 100).toFixed(1)) 
      : 0;
    
    // Generate alerts based on thresholds
    let alert = null;
    if (occupancyRate >= 95) {
      alert = {
        type: 'critical',
        message: `CRITICAL: ${occupancyRate}% occupancy! Immediate action required (${occupied}/${totalBeds} beds)`,
        timestamp: new Date(),
        priority: 5
      };
      await Alert.create({
        type: 'critical',
        message: alert.message,
        ward: req.user.ward || 'All',
        priority: 5
      });
    } else if (occupancyRate >= 90) {
      alert = {
        type: 'critical',
        message: `Critical occupancy: ${occupancyRate}% (${occupied}/${totalBeds} beds occupied)`,
        timestamp: new Date(),
        priority: 4
      };
      await Alert.create({
        type: 'critical',
        message: alert.message,
        ward: req.user.ward || 'All',
        priority: 4
      });
    } else if (occupancyRate >= 80) {
      alert = {
        type: 'warning',
        message: `High occupancy: ${occupancyRate}% (${occupied}/${totalBeds} beds occupied)`,
        timestamp: new Date(),
        priority: 3
      };
      await Alert.create({
        type: 'warning',
        message: alert.message,
        ward: req.user.ward || 'All',
        priority: 3
      });
    }
    
    // Save to history
    await OccupancyHistory.create({
      totalBeds,
      occupied,
      available,
      cleaning,
      reserved,
      maintenance,
      occupancyRate,
      wardStats: wardStats.map(w => ({
        ward: w._id,
        total: w.total,
        occupied: w.occupied,
        available: w.available,
        occupancyRate: parseFloat(((w.occupied / w.total) * 100).toFixed(1))
      })),
      peakHour: occupancyRate >= 85
    });
    
    res.json({
      totalBeds,
      occupied,
      available,
      cleaning,
      reserved,
      maintenance,
      occupancyRate,
      wardStats,
      equipmentStats,
      alert
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get occupancy history
router.get('/history', async (req, res) => {
  try {
    const { period = '24h' } = req.query;
    
    let hoursAgo = 24;
    if (period === '7d') hoursAgo = 168;
    if (period === '30d') hoursAgo = 720;
    
    const startTime = new Date();
    startTime.setHours(startTime.getHours() - hoursAgo);
    
    const history = await OccupancyHistory.find({
      timestamp: { $gte: startTime }
    })
    .sort({ timestamp: 1 })
    .limit(100);
    
    res.json(history);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single bed
router.get('/:id', async (req, res) => {
  try {
    const bed = await Bed.findById(req.params.id).populate('patientId');
    if (!bed) {
      return res.status(404).json({ error: 'Bed not found' });
    }
    
    // Check role-based access
    if ((req.user.role === 'icu_manager' || req.user.role === 'ward_staff') 
        && bed.ward !== req.user.ward) {
      return res.status(403).json({ error: 'Access denied to this ward' });
    }
    
    res.json(bed);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update bed status
router.put('/:id', authorize('admin', 'icu_manager', 'ward_staff'), async (req, res) => {
  try {
    const { status, notes } = req.body;
    
    const bed = await Bed.findById(req.params.id);
    if (!bed) {
      return res.status(404).json({ error: 'Bed not found' });
    }
    
    // Check role-based access
    if ((req.user.role === 'icu_manager' || req.user.role === 'ward_staff') 
        && bed.ward !== req.user.ward) {
      return res.status(403).json({ error: 'Access denied to this ward' });
    }

    const previousStatus = bed.status;
    
    const updatedBed = await Bed.findByIdAndUpdate(
      req.params.id,
      { 
        status, 
        notes,
        lastUpdated: Date.now(),
        ...(status === 'cleaning' && { lastCleaned: Date.now() }),
        ...(status === 'available' && { patientId: null })
      },
      { new: true }
    ).populate('patientId');

    // Create cleaning job if bed status changed from 'occupied' to anything else
    if (previousStatus === 'occupied' && status !== 'occupied') {
      console.log('🧹 Creating cleaning job for bed:', updatedBed.bedNumber);
      const cleaningJob = await CleaningJob.create({
        bedId: updatedBed._id,
        bedNumber: updatedBed.bedNumber,
        ward: updatedBed.ward,
        floor: updatedBed.location.floor,
        section: updatedBed.location.section,
        roomNumber: updatedBed.location.roomNumber,
        status: 'pending'
      });

      console.log('🧹 Cleaning job created:', cleaningJob._id);
      // Emit socket event for new cleaning job notification
      console.log('📡 Emitting newCleaningJob event to all clients');
      req.io.emit('newCleaningJob', cleaningJob);
    }
    
    // Emit socket events
    req.io.emit('bed-updated', updatedBed);
    req.io.to(`bed-${updatedBed._id}`).emit('bed-status-changed', updatedBed);
    req.io.to(`ward-${updatedBed.ward}`).emit('ward-bed-updated', updatedBed);
    
    // Create alert
    await Alert.create({
      type: 'info',
      message: `Bed ${updatedBed.bedNumber} status changed to ${status} by ${req.user.name}`,
      ward: updatedBed.ward,
      bedId: updatedBed._id,
      priority: 2
    });
    
    res.json(updatedBed);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Generate QR code for site
router.get('/qr/site', async (req, res) => {
  try {
    const siteUrl = process.env.FRONTEND_URL || req.headers.origin || 'http://localhost:3000';
    
    const qrCodeImage = await QRCode.toDataURL(siteUrl, {
      errorCorrectionLevel: 'H',
      type: 'image/png',
      width: 400,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });
    
    res.json({ 
      qrCode: qrCodeImage, 
      siteUrl,
      message: 'Scan this QR code to access BedManager from your mobile device'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Recommend bed for emergency
router.post('/recommend', authorize('admin', 'icu_manager', 'er_staff'), async (req, res) => {
  try {
    const { ward, equipmentType, urgency } = req.body;
    
    let recommendedBed = null;
    
    // Priority 1: Match both ward AND equipment
    if (ward && equipmentType) {
      recommendedBed = await Bed.findOne({ 
        status: 'available',
        ward,
        equipmentType
      }).sort({ lastUpdated: 1 });
    }
    
    // Priority 2: Match equipment only
    if (!recommendedBed && equipmentType) {
      recommendedBed = await Bed.findOne({ 
        status: 'available',
        equipmentType
      }).sort({ lastUpdated: 1 });
    }
    
    // Priority 3: Match ward only
    if (!recommendedBed && ward) {
      recommendedBed = await Bed.findOne({ 
        status: 'available',
        ward
      }).sort({ lastUpdated: 1 });
    }
    
    // Priority 4: Any available bed
    if (!recommendedBed) {
      recommendedBed = await Bed.findOne({ 
        status: 'available'
      }).sort({ lastUpdated: 1 });
    }
    
    if (!recommendedBed) {
      const cleaningBeds = await Bed.find({ status: 'cleaning' })
        .sort({ lastCleaned: -1 })
        .limit(5);
      
      const reservedBeds = await Bed.find({ status: 'reserved' })
        .sort({ lastUpdated: 1 })
        .limit(3);
      
      return res.status(404).json({ 
        error: 'No available beds matching criteria',
        suggestion: 'Check beds under cleaning or contact other wards',
        alternatives: {
          cleaning: cleaningBeds,
          reserved: reservedBeds
        },
        message: `Requested: Ward=${ward || 'Any'}, Equipment=${equipmentType || 'Any'}`
      });
    }
    
    res.json({
      bed: recommendedBed,
      matchLevel: getMatchLevel(recommendedBed, ward, equipmentType),
      message: 'Bed recommended based on availability and requirements'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Helper function
function getMatchLevel(bed, requestedWard, requestedEquipment) {
  if (bed.ward === requestedWard && bed.equipmentType === requestedEquipment) {
    return 'perfect';
  } else if (bed.equipmentType === requestedEquipment) {
    return 'equipment_match';
  } else if (bed.ward === requestedWard) {
    return 'ward_match';
  }
  return 'any_available';
}

module.exports = router;