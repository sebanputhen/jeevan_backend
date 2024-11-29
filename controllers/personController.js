const Family = require("../models/Family");
const Person = require("../models/Person");

async function getAllPersons(req, res) {
  try {
    const family = await Family.findOne({ id: req.params.familyid }).exec();
    if (!family) {
      return res.status(404).json({ message: "Family not found." });
    }
    const persons = await Person.find({ family: req.params.familyid })
      .select("_id name relation gender education dob occupation")
      .exec();
    if (!persons) {
      return res.status(404).json({ message: "No persons found." });
    } else {
      return res.status(200).json(persons);
    }
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ message: "An error occurred while fetching persons data." });
  }
}


const mongoose = require("mongoose");

async function getOnePerson(req, res) {
  try {
    const { personid } = req.params;

    console.log("Fetching person with ID:", personid);

    // Fetch the person document
    const person = await Person.findById(personid)
      .populate([
        { path: "forane", select: "_id name" },
        { path: "parish", select: "_id name" },
      ])
      .lean();

    if (!person) {
      return res.status(404).json({ message: "Person not found." });
    }

    // Fetch family manually using the family ID string
    const family = await Family.findOne({ id: person.family }).lean();

    if (family) {
      person.familyDetails = family; // Attach family details manually
    } else {
      person.familyDetails = null; // Handle missing family case
    }

    res.status(200).json(person);
  } catch (err) {
    console.error("Error in getOnePerson:", {
      personId: req.params.personid,
      error: err.message,
      stack: err.stack,
    });

    res.status(500).json({
      message: "An error occurred while fetching the person's data.",
    });
  }
}
async function Education(req, res) {
  try {
    const educationCategories = await Person.distinct("education");
    res.json(educationCategories);
  } catch (error) {
    console.error("Error fetching education categories:", error);
    res.status(500).json({ message: "Error fetching education categories" });
  }
}
/*
async function getPopulationSummary(req, res) {
  try {
    const { foraneId } = req.params; // Get the foraneId from the route parameter, if provided.
    const { startDate, endDate } = req.query; // Extract date range from query parameters.

    // Build the match query dynamically based on foraneId and date range.
    const matchQuery = { status: "alive" }; // Filter by status (alive).
    
    if (foraneId) {
      matchQuery.forane = new mongoose.Types.ObjectId(foraneId); // Add foraneId to the query.
    }

    if (startDate || endDate) {
      matchQuery.dob = {};
      if (startDate) {
        matchQuery.dob.$gte = new Date(startDate); // Add start date filter.
      }
      if (endDate) {
        matchQuery.dob.$lte = new Date(endDate); // Add end date filter.
      }
    }

    // Aggregate the data for persons who match the query.
    const populationStats = await Person.aggregate([
      {
        $match: matchQuery, // Apply the dynamic match query.
      },
      {
        $group: {
          _id: null, // Group all matching persons together.
          totalPopulation: { $sum: 1 }, // Count all persons.
          totalMales: {
            $sum: {
              $cond: [{ $eq: ["$gender", "male"] }, 1, 0], // Count males.
            },
          },
          totalFemales: {
            $sum: {
              $cond: [{ $eq: ["$gender", "female"] }, 1, 0], // Count females.
            },
          },
        },
      },
    ]);

    // If no data was returned.
    if (!populationStats || populationStats.length === 0) {
      return res.status(404).json({ message: "No persons found." });
    }

    const result = populationStats[0];

    // Return the summary.
    res.status(200).json({
      totalPopulation: result.totalPopulation || 0, // Total population.
      totalMales: result.totalMales || 0,           // Total males.
      totalFemales: result.totalFemales || 0,       // Total females.
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      message: "An error occurred while fetching the population summary.",
    });
  }
}
*/
async function getPopulationSummary (req, res) {
  try {
    const { foraneId } = req.params;
    const { startDate, endDate } = req.query;

    // Build the match query dynamically
    const matchQuery = { status: "alive" };
    
    // Handle foraneId from either params or query
    const forane = foraneId || req.query.foraneId;
    if (forane) {
      matchQuery.forane = new mongoose.Types.ObjectId(forane);
    }

    // Date range filtering
    if (startDate || endDate) {
      matchQuery.dob = {};
      if (startDate) {
        matchQuery.dob.$gte = new Date(startDate);
      }
      if (endDate) {
        matchQuery.dob.$lte = new Date(endDate);
      }
    }

    // Aggregate population statistics
    const populationStats = await Person.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: null,
          totalPopulation: { $sum: 1 },
          totalMales: {
            $sum: {
              $cond: [{ $eq: ["$gender", "male"] }, 1, 0],
            },
          },
          totalFemales: {
            $sum: {
              $cond: [{ $eq: ["$gender", "female"] }, 1, 0],
            },
          },
        },
      },
    ]);

    // Handle empty result
    if (!populationStats || populationStats.length === 0) {
      return res.status(200).json({
        totalPopulation: 0,
        totalMales: 0,
        totalFemales: 0,
      });
    }

    const result = populationStats[0];

    res.status(200).json({
      totalPopulation: result.totalPopulation || 0,
      totalMales: result.totalMales || 0,
      totalFemales: result.totalFemales || 0,
    });
  } catch (err) {
    console.error('Population Summary Error:', err);
    res.status(500).json({
      message: "An error occurred while fetching the population summary.",
      error: err.message
    });
  }
};

// Additional Population-related Methods

async function getPopulationBreakdown (req, res) {
  try {
    const { foraneId, startDate, endDate } = req.query;

    const matchQuery = { status: "alive" };
    
    if (foraneId) {
      matchQuery.forane = new mongoose.Types.ObjectId(foraneId);
    }

    if (startDate || endDate) {
      matchQuery.dob = {};
      if (startDate) matchQuery.dob.$gte = new Date(startDate);
      if (endDate) matchQuery.dob.$lte = new Date(endDate);
    }

    const breakdown = await Person.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: {
            forane: "$forane",
            gender: "$gender"
          },
          count: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: "foranes", // Assuming foranes collection exists
          localField: "_id.forane",
          foreignField: "_id",
          as: "foraneDetails"
        }
      },
      {
        $unwind: "$foraneDetails"
      },
      {
        $project: {
          foraneName: "$foraneDetails.name",
          gender: "$_id.gender",
          count: 1,
          _id: 0
        }
      }
    ]);

    res.status(200).json(breakdown);
  } catch (err) {
    console.error('Population Breakdown Error:', err);
    res.status(500).json({
      message: "An error occurred while fetching population breakdown.",
      error: err.message
    });
  }
};

async function getPopulationByAgeGroups  (req, res)  {
  try {
    const { foraneId } = req.query;

    const matchQuery = { status: "alive" };
    if (foraneId) {
      matchQuery.forane = new mongoose.Types.ObjectId(foraneId);
    }

    const ageGroups = await Person.aggregate([
      { $match: matchQuery },
      {
        $addFields: {
          age: {
            $divide: [
              { $subtract: [new Date(), "$dob"] },
              365 * 24 * 60 * 60 * 1000
            ]
          }
        }
      },
      {
        $bucket: {
          groupBy: "$age",
          boundaries: [0, 18, 35, 50, 65, 100],
          default: "65+",
          output: {
            count: { $sum: 1 },
            persons: { $push: "$$ROOT" }
          }
        }
      }
    ]);

    res.status(200).json(ageGroups);
  } catch (err) {
    console.error('Age Groups Error:', err);
    res.status(500).json({
      message: "An error occurred while fetching age groups.",
      error: err.message
    });
  }
};

async function getGenderDistribution  (req, res) {
  try {
    const { foraneId } = req.query;

    const matchQuery = { status: "alive" };
    if (foraneId) {
      matchQuery.forane = new mongoose.Types.ObjectId(foraneId);
    }

    const genderDistribution = await Person.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: "$gender",
          count: { $sum: 1 },
          percentage: { 
            $avg: { 
              $multiply: [
                { $divide: [1, "$total"] }, 
                100 
              ] 
            } 
          }
        }
      }
    ]);

    res.status(200).json(genderDistribution);
  } catch (err) {
    console.error('Gender Distribution Error:', err);
    res.status(500).json({
      message: "An error occurred while fetching gender distribution.",
      error: err.message
    });
  }
};
async function getPopulationByEducation(req, res) {
  try {
    const { foraneId } = req.query;

    // Build match query
    const matchQuery = { status: "alive" };
    if (foraneId) {
      matchQuery.forane = new mongoose.Types.ObjectId(foraneId);
    }

    // Aggregate population by education levels
    const educationDistribution = await Person.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: "$education", // Group by education field
          count: { $sum: 1 },
          percentage: { 
            $multiply: [
              { $divide: [1, { $sum: { $cond: [{ $eq: ["$status", "alive"] }, 1, 0] } }] }, 
              100 
            ] 
          }
        }
      },
      {
        $project: {
          educationLevel: "$_id",
          count: 1,
          percentage: { $round: ["$percentage", 2] },
          _id: 0
        }
      },
      { $sort: { count: -1 } } // Sort by count in descending order
    ]);

    // If no results, return empty array
    if (!educationDistribution || educationDistribution.length === 0) {
      return res.status(200).json([]);
    }

    res.status(200).json(educationDistribution);
  } catch (err) {
    console.error('Population by Education Error:', err);
    res.status(500).json({
      message: "An error occurred while fetching population by education.",
      error: err.message
    });
  }
};
async function createNewPerson(req, res) {
  try {
    const person = await Person.findOne({
      family: req.body.family,
      name: req.body.name,
    }).exec();
    if (!person) {
      if (req.body.email) {
        const email = await Person.findOne({ email: req.body.email }).exec();
        if (email) {
          res.status(409).json({ message: "Email already exists." });
          return;
        }
      }
      const newPerson = new Person(req.body);
      await newPerson.save();
      res.status(201).json({ message: "Person successfully added to family." });
    } else {
      res.status(409).json({ message: "Person already exists." });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
}

async function updatePerson(req, res) {
  try {
    const person = await Person.findByIdAndUpdate(
      req.params.personid,
      req.body
    );
    if (!person) {
      res.status(404).json({ message: "Person not found." });
    } else {
      res.status(200).json({ message: "Person's data updated successfully." });
    }
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ message: "An error occurred while updating person's data." });
  }
}

async function deletePerson(req, res) {
  try {
    await Person.findByIdAndDelete(req.params.personid);
    res.status(200).json({ message: "Person deleted successfully." });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ message: "An error occurred while deleting person" });
  }
}

module.exports = {
  getAllPersons,
  getOnePerson,
  createNewPerson,
  updatePerson,
  deletePerson,
  getPopulationSummary,
  getGenderDistribution,
  getPopulationByAgeGroups,
  getPopulationBreakdown,
  getPopulationByEducation,
  Education,
};
