const Family = require("../models/Family");
const Person = require("../models/Person");
const Parish = require("../models/Parish");
const Koottayma = require("../models/Koottayma");
async function getAllFamilies(req, res) {
  try {
    const families = await Family.find({ koottayma: req.params.koottaymaid })
      .select("_id id name head building phone pincode street city district")
      .populate("head", "_id name")
      .exec();
    if (!families) {
      res.status(404).json({ message: "No families found." });
    } else {
      res.status(200).json(families); 
    }
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ message: "An error occurred while fetching family data." });
  }
}

async function getOneFamily(req, res) {
  try {
    const family = await Family.findOne({ id: req.params.familyid })
      .populate("forane parish koottayma head", "_id name")
      .exec();
    if (!family) {
      res.status(404).json({ message: "Family not found." });
    } else {
      res.status(200).json(family);
    }
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ message: "An error occurred while fetching family data." });
  }
}

async function createNewFamily(req, res) {
  try {
    // Log the parish field in the request to check if it's passed correctly
    console.log('Requested parish ID:', req.body.parish);

    // Ensure the parish field is an ObjectId
    const parishId = req.body.parish;
    if (!parishId) {
      return res.status(400).json({ message: "Parish ID is missing in request." });
    }

    // Fetch the parish name from the Parish collection using the ObjectId
    const parish = await Parish.findById(parishId).exec();

    if (!parish) {
      return res.status(400).json({ message: "Parish not found." });
    }

    // Log the parish data to ensure it's being fetched correctly
    console.log('Fetched parish:', parish);

    // Extract the first 4 letters of the parish name
    const parishPrefix = parish.name.slice(0, 4).toUpperCase(); 

    // Step 3: Find the largest familyNumber for the same parish
    const lastFamily = await Family.find({ parish: parishId })
      .sort({ familyNumber: -1 })  // Sort by familyNumber in descending order
      .limit(1); // Get the family with the largest familyNumber

    let familyNumber = 1; // Default to 1 if no families are found

    if (lastFamily.length > 0) {
      familyNumber = lastFamily[0].familyNumber + 1; // Increment the family number by 1
    }

    // Step 4: Generate the new family ID using the parish prefix and incremented family number
    const familyId = `${parishPrefix}${familyNumber.toString().padStart(3, '0')}`;
    console.log("Generated family ID:", familyId);

    // Step 5: Check if the family already exists with this familyId
    const existingFamily = await Family.findOne({ id: familyId }).exec();
    if (existingFamily) {
      return res.status(409).json({ message: "Family already exists." });
    }

    // Step 6: Create the new family object
    const newFamily = new Family({ ...req.body, id: familyId, familyNumber: familyNumber });

    // If head of family is specified
    if (req.body.head) {
      const newHeadId = req.body.head;
      const person = await Person.findOne({ _id: newHeadId }).exec();
      if (person.relation === "head") {
        return res.status(400).json({
          message: "Cannot create a new family with an existing head.",
        });
      } else {
        await newFamily.save();
        person.family = newFamily.id;
        person.relation = "head";
        await person.save();
        return res.status(201).json({ message: "Family created successfully." });
      }
    }

    // If no head is specified, just save the family
    await newFamily.save();
    return res.status(201).json({ message: "Family created successfully." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
}







async function updateFamily(req, res) {
  try {
    const family = await Family.findOne({ id: req.params.familyid }).exec();
    if (!family) {
      res.status(404).json({ message: "Family not found." });
    } else {
      const newHeadId = req.body.head;
      if (newHeadId && newHeadId !== family.head) {
        const currentHead = await Person.findById(family.head).exec();
        if (currentHead && currentHead.status === "alive") {
          return res.status(400).json({
            message:
              "Cannot change the head of the family unless the current head is deceased or not assigned.",
          });
        }
        await family.updateHead(newHeadId);
      }
      Object.assign(family, req.body);
      await family.save();
      res.status(200).json({ message: "Family updated successfully." });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
}

async function deleteFamily(req, res) {
  try {
    const family = await Family.findOneAndDelete({ id: req.params.familyid });
    if (!family) {
      res.status(404).json({ message: "Family not found." });
    } else {
      res.status(200).json({ message: "Family deleted successfully." });
    }
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ message: "An error occurred while deleting family" });
  }
}
async function getFamiliesByKoottayma(req, res) {
  try {
    
    const familyCounts = await Person.aggregate([
      {
        $group: {
          family: "$family",
          memberCount: { $sum: 1 },
        },
      },
    ]);

    
    const familyCountsMap = familyCounts.reduce((acc, family) => {
      acc[family.family] = family.memberCount;
      return acc;
    }, {});

    const families = await Family.find()
      .populate("head", "_id name") 
      .exec();

   
    const familiesByKoottayma = {};

    families.forEach(family => {
      const koottaymaId = family.koottayma;
      if (!familiesByKoottayma[koottaymaId]) {
        familiesByKoottayma[koottaymaId] = {
          koottaymaId: koottaymaId,
          families: [],
        };
      }
      familiesByKoottayma[koottaymaId].families.push({
        id: family.id,
        name: family.name,
        head: family.head ? family.head.name : "No Head Assigned",
        memberCount: familyCountsMap[family.id] || 0, 
      });
    });

    res.status(200).json(Object.values(familiesByKoottayma));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "An error occurred while fetching family data." });
  }
}


module.exports = {
  getFamiliesByKoottayma,
  getAllFamilies,
  getOneFamily,
  createNewFamily,
  updateFamily,
  deleteFamily,
};
