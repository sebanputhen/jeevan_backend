const CommunitySettings = require('../models/CommunitySettings');
const TotalAmount = require('../models/TotalAmount');
const mongoose = require('mongoose');

const communitySettingsController = {
  // Existing methods remain the same...
  getAll: async (req, res) => {
    try {
      const settings = await CommunitySettings.find().lean();
      const totals = await TotalAmount.find().lean();
      
      res.json({
        settings,
        totals
      });
    } catch (error) {
      console.error('Error in getAll:', error);
      res.status(500).json({ message: error.message });
    }
  },

  getByYear: async (req, res) => {
    try {
      const year = parseInt(req.params.year);
      
      if (isNaN(year)) {
        throw new Error('Invalid year parameter');
      }

      const [totals, settings] = await Promise.all([
        TotalAmount.findOne({ year }).lean(),
        CommunitySettings.find({ year }).lean()
      ]);
      
      res.json({
        year,
        total_amount: totals?.total_amount || 0,
        total_allocated: totals?.total_allocated || 0,
        remaining_amount: (totals?.total_amount || 0) - (totals?.total_allocated || 0),
        parish_percentage: totals?.parish_percentage || 0,
        parish_amount: totals?.parish_amount || 0,
        other_projects_percentage: totals?.other_projects_percentage || 0,
        other_projects_amount: totals?.other_projects_amount || 0,
        balance_after_community: totals?.balance_after_community || 0,
        settings: settings || []
      });
    } catch (error) {
      console.error('Error in getByYear:', error);
      res.status(500).json({ message: error.message });
    }
  },

  getByCommunity: async (req, res) => {
    try {
      const { communityId } = req.params;
      
      if (!mongoose.Types.ObjectId.isValid(communityId)) {
        return res.status(400).json({ message: 'Invalid community ID' });
      }

      const settings = await CommunitySettings.find({ 
        community_id: communityId 
      }).lean();

      res.json(settings);
    } catch (error) {
      console.error('Error in getByCommunity:', error);
      res.status(500).json({ message: error.message });
    }
  },

  saveBulkSettings: async (req, res) => {
    try {
      const { 
        settings, 
        total_amount, 
        year,
        parishPercentage,
        parishAmount,
        otherProjectsPercentage,
        otherProjectsAmount
      } = req.body;

      if (!settings || !Array.isArray(settings) || settings.length === 0) {
        throw new Error('Invalid settings data');
      }

      const totalPercentage = settings.reduce((acc, curr) => acc + Number(curr.percentage), 0);
      const totalAllocated = settings.reduce((acc, curr) => acc + Number(curr.allocated_amount), 0);

      if (totalPercentage > 100) {
        throw new Error('Total percentage cannot exceed 100%');
      }

      if (totalAllocated > total_amount) {
        throw new Error('Total allocated amount cannot exceed total amount');
      }

      const balanceAfterCommunity = Number(total_amount) - Number(totalAllocated.toFixed(2));

      // Format the settings data
      const formattedSettings = settings.map(setting => ({
        community_id: setting.community_id,
        community_name: setting.community_name,
        percentage: Number(Number(setting.percentage).toFixed(2)),
        allocated_amount: Number(Number(setting.allocated_amount).toFixed(2)),
        year
      }));

      // Update total amounts
      const totalAmountData = {
        total_amount: Number(total_amount),
        total_allocated: Number(totalAllocated.toFixed(2)),
        balance_after_community: balanceAfterCommunity,
        parish_percentage: Number(parishPercentage || 0),
        parish_amount: Number(parishAmount || 0),
        other_projects_percentage: Number(otherProjectsPercentage || 0),
        other_projects_amount: Number(otherProjectsAmount || 0),
        year
      };

      // Perform updates sequentially
      await TotalAmount.findOneAndUpdate(
        { year },
        totalAmountData,
        { upsert: true, new: true }
      );

      await CommunitySettings.deleteMany({ year });
      const savedSettings = await CommunitySettings.insertMany(formattedSettings);

      res.status(201).json({
        message: 'Settings saved successfully',
        total_amount: Number(total_amount),
        total_allocated: Number(totalAllocated.toFixed(2)),
        balance_after_community: balanceAfterCommunity,
        parish_percentage: Number(parishPercentage || 0),
        parish_amount: Number(parishAmount || 0),
        other_projects_percentage: Number(otherProjectsPercentage || 0),
        other_projects_amount: Number(otherProjectsAmount || 0),
        settings: savedSettings
      });
    } catch (error) {
      console.error('Error in saveBulkSettings:', error);
      res.status(400).json({ message: error.message });
    }
  },

  // New method for parish allocation
  getParishAllocation: async (req, res) => {
    try {
      const { year } = req.params;
      const totals = await TotalAmount.findOne({ year: parseInt(year) }).lean();
      
      res.json({
        balance_after_community: totals?.balance_after_community || 0,
        parish_percentage: totals?.parish_percentage || 0,
        parish_amount: totals?.parish_amount || 0,
        other_projects_percentage: totals?.other_projects_percentage || 0,
        other_projects_amount: totals?.other_projects_amount || 0
      });
    } catch (error) {
      console.error('Error in getParishAllocation:', error);
      res.status(500).json({ message: error.message });
    }
  },

  // Save parish allocation
  saveParishAllocation: async (req, res) => {
    try {
      const {
        parishPercentage,
        parishAmount,
        otherProjectsPercentage,
        otherProjectsAmount,
        year
      } = req.body;

      const totals = await TotalAmount.findOneAndUpdate(
        { year },
        {
          parish_percentage: Number(parishPercentage),
          parish_amount: Number(parishAmount),
          other_projects_percentage: Number(otherProjectsPercentage),
          other_projects_amount: Number(otherProjectsAmount)
        },
        { new: true }
      );

      res.json({
        message: 'Parish allocation saved successfully',
        data: totals
      });
    } catch (error) {
      console.error('Error in saveParishAllocation:', error);
      res.status(500).json({ message: error.message });
    }
  }
};

module.exports = communitySettingsController;