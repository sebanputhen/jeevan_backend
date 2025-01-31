const ProjectSettings = require('../models/ProjectSettings');
const TotalAmount = require('../models/TotalAmount');
const BalanceSheet = require('../models/BalanceSheet');
const mongoose = require('mongoose');
const projectSettingsController = {
  // Get all project settings for a specific year
  getAll: async (req, res) => {
    try {
      const year = parseInt(req.query.year) || new Date().getFullYear();
      const settings = await ProjectSettings.find({ year })
        .populate('project_id')
        .sort('project_name');
      
      if (!settings) {
        return res.status(404).json({ message: "No settings found for the specified year." });
      }

      res.json({
        success: true,
        data: settings
      });
    } catch (error) {
      console.error('Error in getAll:', error);
      res.status(500).json({ message: error.message });
    }
  },

  // Get by year with total amounts
  getByYear: async (req, res) => {
    try {
      const year = parseInt(req.params.year);
      
      if (isNaN(year)) {
        throw new Error('Invalid year parameter');
      }

      // Get both current year and previous year data
      const [currentYear, previousYear, settings] = await Promise.all([
        TotalAmount.findOne({ year }).lean(),
        TotalAmount.findOne({ year: year - 1 }).lean(),
        ProjectSettings.find({ year }).lean().sort('project_name')
      ]);

      // Get previous year settings for comparison
      const previousSettings = await ProjectSettings.find({ year: year - 1 }).lean();
      const previousSettingsMap = new Map(
        previousSettings.map(setting => [setting.project_id.toString(), setting])
      );

      // Add previous year data to current settings
      const enhancedSettings = settings.map(setting => ({
        ...setting,
        previous_year_amount: previousSettingsMap.get(setting.project_id.toString())?.allocated_amount || 0
      }));

      res.json({
        year,
        total_amount: currentYear?.total_amount || 0,
        total_allocated: currentYear?.total_allocated || 0,
        remaining_amount: (currentYear?.total_amount || 0) - (currentYear?.total_allocated || 0),
        previous_year_total: previousYear?.total_amount || 0,
        settings: enhancedSettings || []
      });
    } catch (error) {
      console.error('Error in getByYear:', error);
      res.status(500).json({ message: error.message });
    }
  },


  saveBulkSettings: async (req, res) => {
    try {
      const { settings, total_amount, year } = req.body;
  
      if (!settings?.length) {
        throw new Error('Invalid settings data');
      }
  
      const formattedSettings = settings.map(setting => ({
        project_id: setting.project_id,
        project_name: setting.project_name,
        percentage: Number(setting.percentage),
        allocated_amount: Number(setting.allocated_amount),
        year
      }));
  
      await ProjectSettings.deleteMany({ year });
      const savedSettings = await ProjectSettings.insertMany(formattedSettings);
  
      for (const setting of formattedSettings) {
        const existingBalance = await BalanceSheet.findOne({
          year,
          entity_type: 'project',
          entity_id: setting.project_id
        });
  
        await BalanceSheet.findOneAndUpdate(
          {
            year,
            entity_type: 'project',
            entity_id: setting.project_id
          },
          {
            $set: {
              opening_balance: existingBalance?.opening_balance || 0,
              allocated_amount: setting.allocated_amount,
              total_transactions: existingBalance?.total_transactions || 0
            }
          },
          { upsert: true, new: true }
        );
      }
  
      res.status(201).json({
        message: 'Settings saved successfully',
        settings: savedSettings
      });
    } catch (error) {
      console.error('Error in saveBulkSettings:', error);
      res.status(400).json({ message: error.message });
    }
  },



  // Update a single project setting
  updateSetting: async (req, res) => {
    try {
      const setting = await ProjectSettings.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true, runValidators: true }
      );

      if (!setting) {
        return res.status(404).json({ message: "Setting not found." });
      }

      // Update total allocated amount
      const yearSettings = await ProjectSettings.find({ year: setting.year });
      const totalAllocated = yearSettings.reduce((sum, s) => sum + s.allocated_amount, 0);

      await TotalAmount.findOneAndUpdate(
        { year: setting.year },
        { total_allocated: totalAllocated }
      );

      res.json({
        message: 'Setting updated successfully',
        data: setting
      });
    } catch (error) {
      console.error('Error in updateSetting:', error);
      res.status(400).json({ message: error.message });
    }
  },

  // Delete a project setting
  deleteSetting: async (req, res) => {
    try {
      const setting = await ProjectSettings.findById(req.params.id);
      
      if (!setting) {
        return res.status(404).json({ message: "Setting not found." });
      }

      await ProjectSettings.findByIdAndDelete(req.params.id);

      // Update total allocated amount
      const yearSettings = await ProjectSettings.find({ year: setting.year });
      const totalAllocated = yearSettings.reduce((sum, s) => sum + s.allocated_amount, 0);

      await TotalAmount.findOneAndUpdate(
        { year: setting.year },
        { total_allocated: totalAllocated }
      );

      res.json({ message: 'Setting deleted successfully' });
    } catch (error) {
      console.error('Error in deleteSetting:', error);
      res.status(400).json({ message: error.message });
    }
  }
};

module.exports = projectSettingsController;