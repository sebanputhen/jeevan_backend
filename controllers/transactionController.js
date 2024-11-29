const Transaction = require("../models/Transaction");
const Person = require("../models/Person");
const mongoose = require("mongoose");

async function getAllFamilyTransactions(req, res) {
  try {
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error fetching family transactions" });
  }
}
async function getTransactionsByYear(req, res) {
  try {
    const familyId = req.params.familyId;

    // Aggregate transactions by year
    const transactionsByYear = await Transaction.aggregate([
      {
        $match: {
          family: familyId, // Filter by family ID
        },
      },
      {
        $group: {
          _id: { $year: { $toDate: "$date" } }, // Extract year from the 'date' field
          totalAmount: { $sum: "$amountPaid" }, // Sum the amountPaid for each year
          transactions: { $push: "$$ROOT" }, // Include all transaction details
        },
      },
      {
        $sort: { _id: 1 }, // Sort the years in ascending order
      },
    ]);

    // Format the response
    const response = transactionsByYear.map((item) => ({
      year: item._id, // Year
      totalAmount: item.totalAmount, // Total amount for the year
      transactions: item.transactions.map((transaction) => ({
        _id: transaction._id,
        amountPaid: transaction.amountPaid,
        date: new Date(transaction.date).toISOString().split("T")[0], // Format date to YYYY-MM-DD
      })), // List of transactions for the year
    }));

    res.status(200).json(response);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      message: "An error occurred while fetching transactions grouped by year.",
    });
  }
}
async function calculateYearlyDataTotal(req, res) {
  try {
    // Aggregate data for all years, grouped by year
    const stats = await Transaction.aggregate([
      {
        $group: {
          _id: { year: { $year: { $toDate: "$date" } } }, // Group by year extracted from the 'date' field
          totalAmount: { $sum: "$amountPaid" }, // Sum of all amountPaid for each year
          totalParticipants: { $sum: 1 }, // Count the total number of participants (assuming each transaction represents one participant)
        },
      },
      {
        $project: {
          _id: 0, // Remove _id from the result
          year: "$_id.year", // Include the year in the result
          totalAmount: 1, // Include totalAmount
          totalParticipants: 1, // Include totalParticipants
        },
      },
      { $sort: { year: 1 } }, // Sort by year (ascending)
    ]);

    if (!stats || stats.length === 0) {
      return res.status(404).json({ message: "No data found." });
    }

    res.status(200).json(stats); // Return the aggregated stats by year
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "An error occurred while calculating yearly totals." });
  }
}


async function calculateYearlyData(req, res) {
  try {
    const { year } = req.params; // Get year from URL parameter
    const parsedYear = parseInt(year, 10);

    if (isNaN(parsedYear)) {
      return res.status(400).json({ message: "Invalid year parameter" });
    }

    // Aggregate data for the selected year
    const stats = await Transaction.aggregate([
      {
        $match: {
          // Match only transactions for the selected year
          $expr: { $eq: [{ $year: { $toDate: "$date" } }, parsedYear] },
        },
      },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: "$amountPaid" },
          parishCount: { $addToSet: "$parish" },
          foraneCount: { $addToSet: "$forane" },
          familyCount: { $addToSet: "$family" },
        },
      },
      {
        $project: {
          _id: 0,
          totalAmount: 1,
          parishCount: { $size: "$parishCount" },
          foraneCount: { $size: "$foraneCount" },
          familyCount: { $size: "$familyCount" },
        },
      },
    ]);

    if (!stats || stats.length === 0) {
      return res.status(404).json({ message: "No data found for the selected year" });
    }

    const result = stats[0];
    res.status(200).json({
      totalAmount: result.totalAmount || 0,
      parishCount: result.parishCount || 0,
      foraneCount: result.foraneCount || 0,
      familyCount: result.familyCount || 0,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "An error occurred while calculating yearly stats." });
  }
}




async function calculateYearlyDataByForane(req, res) {
  try {
    const { year, foraneId } = req.params;
    const parsedYear = parseInt(year, 10);

    if (isNaN(parsedYear)) {
      return res.status(400).json({ message: "Invalid year parameter" });
    }

    // Ensure foraneId is a valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(foraneId)) {
      return res.status(400).json({ message: "Invalid foraneId parameter" });
    }

    console.log("Forane ID:", foraneId);  // Logging for debugging
    console.log("Parsed Year:", parsedYear);

    const stats = await Transaction.aggregate([
      {
        $match: {
          forane: new mongoose.Types.ObjectId(foraneId), // Using 'new' to correctly instantiate ObjectId
          $expr: { $eq: [{ $year: { $toDate: "$date" } }, parsedYear] },
        },
      },
      {
        $group: {
          _id: { forane: "$forane", parish: "$parish" },
          totalAmount: { $sum: "$amountPaid" },
        },
      },
      {
        $sort: { "_id.forane": 1, "_id.parish": 1 },
      },
    ]);

    if (!stats || stats.length === 0) {
      return res.status(404).json({ message: "No data found for the selected year and forane" });
    }

    const result = stats.map((item) => ({
      forane: item._id.forane,
      parish: item._id.parish,
      totalAmount: item.totalAmount,
    }));

    res.status(200).json(result);
  } catch (err) {
    console.error("Error details:", err);  // Log the full error
    res.status(500).json({ 
      message: "An error occurred while calculating yearly stats by forane and parish.",
      error: err.message  // Include the error message for more context
    });
  }
}


async function getLatestTransaction(req, res) {
  try {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();

    const transaction = await Transaction.findOne({
      person: req.params.personid,
      $expr: { $eq: [{ $year: "$createdAt" }, currentYear] },
    })
      .sort({ createdAt: -1 }) // Sort by createdAt in descending order
      .exec();
      
    console.log("Transaction retrieved:", transaction);

    if (!transaction) {
      return res
        .status(404)
        .json({ message: "No transactions found for this person" });
    }

    // Ensure the 'amountPaid' exists in the returned transaction
    if (typeof transaction.amountPaid === "undefined") {
      console.warn("Transaction found but 'amountPaid' is undefined:", transaction);
      return res.status(500).json({ message: "'amountPaid' is missing in the transaction" });
    }

    return res.status(200).json(transaction);
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ message: "Cannot get person's latest transaction." });
  }
}



async function createNewTransaction(req, res) {
  try {
    const newTransaction = new Transaction(req.body);
    await newTransaction.save();
    res.status(201).json({ message: "Transaction successfully recorded." });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: err.message });
  }
}

async function calculateForaneTotal(req, res) {
  try {
    const total = await Transaction.aggregate([
      { $match: { forane: new mongoose.Types.ObjectId(req.params.foraneid) } },
      { $group: { _id: null, totalAmount: { $sum: "$amountPaid" } } },
    ]);
    res.status(200).json({ totalAmount: total[0]?.totalAmount || 0 });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      message:
        "An error occurred while calculating the total amount for the Forane.",
    });
  }
}

async function calculateParishTotal(req, res) {
  try {
    const total = await Transaction.aggregate([
      { $match: { parish: new mongoose.Types.ObjectId(req.params.parishid) } },
      { $group: { _id: null, totalAmount: { $sum: "$amountPaid" } } },
    ]);
    res.status(200).json({ totalAmount: total[0]?.totalAmount || 0 });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      message:
        "An error occurred while calculating the total amount for the Parish.",
    });
  }
}

async function calculateFamilyTotal(req, res) {
  try {
    const total = await Transaction.aggregate([
      { $match: { family: req.params.familyid } },
      { $group: { _id: null, totalAmount: { $sum: "$amountPaid" } } },
    ]);
    res.status(200).json({ totalAmount: total[0]?.totalAmount || 0 });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      message:
        "An error occurred while calculating the total amount for the Family.",
    });
  }
}

async function calculatePersonTotal(req, res) {
  try {
    const total = await Transaction.aggregate([
      { $match: { person: new mongoose.Types.ObjectId(req.params.personid) } },
      { $group: { _id: null, totalAmount: { $sum: "$amountPaid" } } },
    ]);
    res.status(200).json({ totalAmount: total[0]?.totalAmount || 0 });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      message:
        "An error occurred while calculating the total amount for the Person.",
    });
  }
}

async function updateTransaction(req, res) {
  try {
    const transaction = await Transaction.findByIdAndUpdate(
      req.params.transactionid,
      req.body
    );
    if (!transaction) {
      res.status(404).json({ message: "Transaction not found." });
    } else {
      res.status(200).json({ message: "Transaction updated successfully." });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({
      message: "An error occured while updating transaction.",
    });
  }
}

module.exports = {
  createNewTransaction,
  calculateForaneTotal,
  calculateParishTotal,
  calculateFamilyTotal,
  calculatePersonTotal,
  updateTransaction,
  getLatestTransaction,
  getTransactionsByYear,
  calculateYearlyData,
  calculateYearlyDataByForane,
  calculateYearlyDataTotal,
};
