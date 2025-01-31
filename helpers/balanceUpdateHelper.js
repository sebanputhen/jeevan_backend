// Create this new file: src/helpers/balanceUpdateHelper.js

const mongoose = require('mongoose');
const BalanceSheet = require('../models/BalanceSheet');

async function updateBalanceSheet(year, entityType, entityId, amount, isAdd, session) {
  const balanceSheet = await BalanceSheet.findOne({
    year,
    entity_type: entityType,
    entity_id: entityId
  }).session(session);

  if (!balanceSheet) {
    throw new Error(`No balance sheet found for ${entityType} ${entityId} in year ${year}`);
  }

  // Update total transactions based on whether we're adding or subtracting
  const updateAmount = isAdd ? -amount : amount;
  balanceSheet.total_transactions += updateAmount;
  
  // Update last transaction date if adding a new transaction
  if (isAdd) {
    balanceSheet.last_transaction_date = new Date();
  }

  await balanceSheet.save({ session });
  return balanceSheet.current_balance;
}

function getEntityType(transactionType) {
  switch (transactionType) {
    case 'community':
      return 'community';
    case 'otherProject':
      return 'project';
    case 'family':
      return 'parish';
    default:
      throw new Error('Invalid transaction type');
  }
}

function getEntityId(transaction) {
  switch (transaction.transaction_type) {
    case 'community':
      return transaction.community_id;
    case 'otherProject':
      return transaction.fund_id;
    case 'family':
      return transaction.parish_id;
    default:
      throw new Error('Invalid transaction type');
  }
}

module.exports = {
  updateBalanceSheet,
  getEntityType,
  getEntityId
};