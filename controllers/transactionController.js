const Transaction = require("../models/Transaction");
const Person = require("../models/Person");
const Parish = require("../models/Parish");
const Families = require("../models/Family");
const koottaymas = require("../models/Koottayma");
const mongoose = require("mongoose");

async function getAllFamilyTransactions(req, res) {
  try {
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error fetching family transactions" });
  }
}

const calculateTranParishTotal = async (req, res) => {
  try {
      const { year } = req.params;
      const yearNum = parseInt(year);
      const startDate = new Date(`${yearNum}-04-01`);
      const endDate = new Date(`${yearNum + 1}-03-31`);

      // Single aggregation pipeline to get all parishes and their totals
      const parishTotals = await Parish.aggregate([
          // Start with all parishes
          {
              $lookup: {
                  from: 'transactions',
                  let: { parishId: '$_id' },
                  pipeline: [
                      {
                          $match: {
                              $expr: {
                                  $and: [
                                      { $eq: ['$parish', '$$parishId'] },
                                      { $eq: ['$status', 'active'] },
                                      { $gte: ['$date', startDate] },
                                      { $lte: ['$date', endDate] }
                                  ]
                              }
                          }
                      },
                      {
                          $group: {
                              _id: null,
                              totalAmount: { $sum: '$amountPaid' }
                          }
                      }
                  ],
                  as: 'transactionStats'
              }
          },
          // Project only needed fields
          {
              $project: {
                  name: 1,
                  totalAmount: {
                      $cond: {
                          if: { $gt: [{ $size: '$transactionStats' }, 0] },
                          then: { $arrayElemAt: ['$transactionStats.totalAmount', 0] },
                          else: 0
                      }
                  }
              }
          },
          // Sort by parish name
          {
              $sort: { name: 1 }
          },
          // Add error handling in case of null values
          {
              $project: {
                  name: 1,
                  totalAmount: { $ifNull: ['$totalAmount', 0] }
              }
          }
      ]);

      res.status(200).json(parishTotals);

  } catch (error) {
      console.error('Error calculating parish totals:', {
          message: error.message,
          stack: error.stack
      });
      
      res.status(500).json({
          message: "Error calculating parish totals",
          error: error.message,
          ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
      });
  }
};

async function getTransactionsByYear(req, res) {
  try {
    const familyId = req.params.familyId;

    const transactionsByYear = await Transaction.aggregate([
      {
        $match: {
          family: familyId,
        },
      },
      {
        $addFields: {
          financialYear: {
            $switch: {
              branches: [
                {
                  // April to December - Current Year
                  case: {
                    $and: [
                      { $gte: [{ $month: "$date" }, 4] },
                      { $lte: [{ $month: "$date" }, 12] }
                    ]
                  },
                  then: { $year: "$date" }
                },
                {
                  // January to March - Previous Year
                  case: {
                    $and: [
                      { $gte: [{ $month: "$date" }, 1] },
                      { $lte: [{ $month: "$date" }, 3] }
                    ]
                  },
                  then: { $subtract: [{ $year: "$date" }, 1] }
                }
              ],
              default: { $year: "$date" }
            }
          }
        },
      },
      {
        $group: {
          _id: "$financialYear",
          totalAmountPaid: { $sum: "$amountPaid" },
          startYear: { $first: "$financialYear" },
        },
      },
      {
        $project: {
          _id: 0,
          financialYear: {
            $concat: [
              { $toString: "$startYear" },
              "-",
              { $toString: { $subtract: [{ $add: ["$startYear", 1] }, 2000] } }
            ]
          },
          totalAmountPaid: 1
        }
      },
      {
        $sort: { financialYear: 1 },
      },
    ]);

    res.status(200).json(transactionsByYear);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      message: "An error occurred while fetching total sum of transactions by year.",
    });
  }
}

async function calculateYearlyDataTotal(req, res) {
  try {
    const stats = await Transaction.aggregate([
      {
        $addFields: {
          financialYear: {
            $switch: {
              branches: [
                {
                  // April to December - Current Year
                  case: {
                    $and: [
                      { $gte: [{ $month: "$date" }, 4] },
                      { $lte: [{ $month: "$date" }, 12] }
                    ]
                  },
                  then: { $year: "$date" }
                },
                {
                  // January to March - Previous Year
                  case: {
                    $and: [
                      { $gte: [{ $month: "$date" }, 1] },
                      { $lte: [{ $month: "$date" }, 3] }
                    ]
                  },
                  then: { $subtract: [{ $year: "$date" }, 1] }
                }
              ],
              default: { $year: "$date" }
            }
          }
        }
      },
      {
        $group: {
          _id: "$financialYear",
          totalAmount: { $sum: "$amountPaid" },
          totalParticipants: { $sum: 1 },
          startYear: { $first: "$financialYear" }
        }
      },
      {
        $project: {
          _id: 0,
          financialYear: {
            $concat: [
              { $toString: "$startYear" },
              "-",
              { $toString: { $subtract: [{ $add: ["$startYear", 1] }, 2000] } }
            ]
          },
          year: "$startYear",
          totalAmount: 1,
          totalParticipants: 1
        }
      },
      {
        $sort: { year: 1 }
      }
    ]);

    if (!stats || stats.length === 0) {
      return res.status(404).json({ message: "No data found." });
    }

    res.status(200).json(stats);
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
          date: {
            $gte: new Date(`${parsedYear}-04-01`),  // Start of financial year (April 1st)
            $lte: new Date(`${parsedYear + 1}-03-31`)  // End of financial year (March 31st next year)
          },
          status: "active"
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
          date: {
            $gte: new Date(`${parsedYear}-04-01`),  // Start of financial year (April 1st)
            $lte: new Date(`${parsedYear + 1}-03-31`)  // End of financial year (March 31st next year)
          }
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
      date: {
        $gte: new Date(`${currentYear}-04-01`),  // Start of financial year (April 1st)
        $lte: new Date(`${currentYear + 1}-03-31`)  // End of financial year (March 31st next year)
      }
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
async function getPersonByYear(req, res) {
  try {
    const { personid, year } = req.params;
    // Find all transactions for the person in the specific year
    const transactions = await Transaction.find({ 
      person: personid, 
      date: { 
        $gte: new Date(`${year}-04-01`), 
        $lte: new Date(`${year+1}-03-31`) 
      }
    });
    
    // Calculate total amount for the year
    const totalAmount = transactions.reduce((sum, transaction) => sum + transaction.amountPaid, 0);
    
    res.status(200).json({ 
      transactions, 
      totalAmount 
    });
  } catch (error) {
    res.status(500).json({ error: "An error occurred while fetching transactions by year." });
  }
}
async function getAllPersonTransactions(req, res) {
  try {
    const transactions = await Transaction.find({
      person: req.params.personId
    }).sort({ date: -1 });

    res.json({
      transactions,
      count: transactions.length
    });
  } catch (error) {
    res.status(500).json({ message: "Error fetching transactions" });
  }
}
async function transferTransaction(req, res) {
  try {
    const {
      fromPerson,
      toPerson,
      forane,
      parish,
      family,
      status,
      reason,
      amount,
      date
    } = req.body;

    // Find existing transaction
    const existingTransaction = await Transaction.findOne({
      person: fromPerson,
      date: {
        $gte: new Date(new Date().getFullYear(), 4, 1),
        $lte: new Date(new Date().getFullYear(), 3, 31)
      }
      
    });

    if (!existingTransaction) {
      // Create new transaction for head if no existing transaction
      const newTransaction = new Transaction({
        forane,
        parish,
        family,
        person: toPerson,
        amountPaid: amount,
        date,
        originalPerson: fromPerson,
        isTransferred: true,
        transferReason: reason,
        transferDate: new Date(),
        status: 'transferred',
        transferHistory: [{
          fromPerson,
          toPerson,
          reason,
          status,
          transferDate: new Date()
        }]
      });

      await newTransaction.save();
      return res.json({
        message: 'New transaction created for head',
        transaction: newTransaction
      });
    }

    // If existing transaction, transfer it
    existingTransaction.person = toPerson;
    existingTransaction.isTransferred = true;
    existingTransaction.transferReason = reason;
    existingTransaction.transferDate = new Date();
    existingTransaction.status = 'transferred';
    existingTransaction.transferHistory.push({
      fromPerson,
      toPerson,
      reason,
      status,
      transferDate: new Date()
    });

    await existingTransaction.save();

    res.json({
      message: 'Transaction transferred successfully',
      transaction: existingTransaction
    });

  } catch (error) {
    console.error('Transfer error:', error);
    res.status(500).json({
      message: error.message || 'Failed to transfer transaction'
    });
  }
}
async function updateTransaction(req, res) {
  try {
    const transaction = await Transaction.findByIdAndUpdate(
      req.params.transactionId,
      req.body,
      { new: true }
    );
    
    if (!transaction) {
      return res.status(404).json({ message: "Transaction not found." });
    }
    
    res.status(200).json(transaction);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error updating transaction." });
  }
}
// Add to transactionController.js
const getKoottaymaWiseTitheInfo = async (req, res) => {
  try {
    const { parishId } = req.params;
    const currentYear = new Date().getFullYear()-1;
    const startDate = new Date(`${currentYear}-04-01`);
    const endDate = new Date(`${currentYear + 1}-03-31`);

    const pipeline = [
      // Start with koottaymas
      {
        $match: {
          parish: new mongoose.Types.ObjectId(parishId)
        }
      },
      // Lookup families in each koottayma
      {
        $lookup: {
          from: 'families',
          localField: '_id',
          foreignField: 'koottayma',
          as: 'families'
        }
      },
      // Unwind families to process each
      {
        $unwind: {
          path: '$families',
          preserveNullAndEmptyArrays: true
        }
      },
      // Lookup head of each family
      {
        $lookup: {
          from: 'people',
          localField: 'families.head',
          foreignField: '_id',
          as: 'headInfo'
        }
      },
      {
        $unwind: {
          path: '$headInfo',
          preserveNullAndEmptyArrays: true
        }
      },
      // Lookup transactions for each family
      {
        $lookup: {
          from: 'transactions',
          let: { 
            familyId: { $toString: '$families.id' },
            startDate: startDate,
            endDate: endDate
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$family', '$$familyId'] },
                    { $gte: ['$date', '$$startDate'] },
                    { $lte: ['$date', '$$endDate'] }
                  ]
                }
              }
            },
            {
              $lookup: {
                from: 'people',
                localField: 'person',
                foreignField: '_id',
                as: 'memberInfo'
              }
            },
            {
              $unwind: {
                path: '$memberInfo',
                preserveNullAndEmptyArrays: true
              }
            }
          ],
          as: 'transactions'
        }
      },
      // Group back to family level
      {
        $group: {
          _id: {
            koottaymaId: '$_id',
            familyId: '$families.id'
          },
          koottaymaName: { $first: '$name' },
          houseName: { $first: '$families.name' },
          phone: { $first: '$families.phone' },
          headName: { $first: '$headInfo.name' },
          members: {
            $first: {
              $map: {
                input: '$transactions',
                as: 'txn',
                in: {
                  memberName: '$$txn.memberInfo.name',
                  amount: '$$txn.amountPaid'
                }
              }
            }
          },
          totalFamilyAmount: { 
            $sum: '$transactions.amountPaid'
          }
        }
      },
      // Group by koottayma
      {
        $group: {
          _id: '$_id.koottaymaId',
          name: { $first: '$koottaymaName' },
          families: {
            $push: {
              familyId: '$_id.familyId',
              houseName: '$houseName',
              phone: '$phone',
              headName: { $ifNull: ['$headName', 'No Head Assigned'] },
              members: { $ifNull: ['$members', []] },
              totalAmount: { $ifNull: ['$totalFamilyAmount', 0] }
            }
          },
          totalAmount: { $sum: { $ifNull: ['$totalFamilyAmount', 0] } }
        }
      },
      // Sort by koottayma name
      {
        $sort: { name: 1 }
      }
    ];

    const titheInfo = await koottaymas.aggregate(pipeline);

    if (!titheInfo || titheInfo.length === 0) {
      return res.status(200).json([]);
    }

    res.status(200).json(titheInfo);

  } catch (error) {
    console.error('Error in getKoottaymaWiseTitheInfo:', error);
    res.status(500).json({ message: error.message });
  }
};
const getConsolidatedTitheByKoottayma = async (req, res) => {
  try {
    const { parishId } = req.params;
    const currentYear = new Date().getFullYear()-1;
    const startDate = new Date(`${currentYear}-04-01`);
    const endDate = new Date(`${currentYear + 1}-03-31`);

    // First get all koottaymas for the parish
    const consolidatedTithe = await koottaymas.aggregate([
      // Start with all koottaymas for this parish
      {
        $match: {
          parish: new mongoose.Types.ObjectId(parishId)
        }
      },
      // Lookup transactions for each koottayma
      {
        $lookup: {
          from: 'families',
          localField: '_id',
          foreignField: 'koottayma',
          as: 'families'
        }
      },
      // Unwind families array to lookup transactions
      {
        $unwind: {
          path: '$families',
          preserveNullAndEmptyArrays: true
        }
      },
      // Convert family id to number for transaction lookup
      {
        $addFields: {
          'families.idNum': { $toString: '$families.id' }
        }
      },
      // Lookup transactions for each family
      {
        $lookup: {
          from: 'transactions',
          let: { 
            familyId: '$families.idNum',
            startDate: startDate,
            endDate: endDate
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$family', '$$familyId'] },
                    { $gte: ['$date', '$$startDate'] },
                    { $lte: ['$date', '$$endDate'] }
                  ]
                }
              }
            }
          ],
          as: 'transactions'
        }
      },
      // Group back to koottayma level
      {
        $group: {
          _id: '$_id',
          name: { $first: '$name' },
          amount: {
            $sum: {
              $sum: '$transactions.amountPaid'
            }
          }
        }
      },
      // Sort by name
      {
        $sort: { name: 1 }
      }
    ]);

    res.status(200).json(consolidatedTithe);
  } catch (error) {
    console.error('Error in getConsolidatedTitheByKoottayma:', error);
    res.status(500).json({ message: error.message });
  }
};


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
  getPersonByYear,
  getAllPersonTransactions,
  transferTransaction,
  calculateTranParishTotal,
  getKoottaymaWiseTitheInfo,
  getConsolidatedTitheByKoottayma,
};
