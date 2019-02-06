const mongoose = require('mongoose');
const ServiceInfoModel = require('../model/serviceinfo');
const { isOutOfSyncing, reducedErrorMessage, web3, loomProvider } = require('../modules/utils');

// apis

exports.getMonitor = async (req, res) => { // eslint-disable-line
  return res.status(200).send({ result: 'ok', message: 'Server is working now !' });
};

exports.getMonitorDb = async (req, res) => {
  try {
    if (mongoose.connection.readyState) {
      return res.status(200).send({ result: 'ok', message: 'Db is working now !' });
    }
    throw new Error('db error');
  } catch (error) {
    return res.status(400).send({ result: 'error', message: 'Db is not working now !' });
  }
};

exports.getMonitorRpc = async (req, res) => {
  try {
    const jsonRPCString = '{"jsonrpc":"2.0","method":"net_version","params":[],"id":67}';
    const jsonResponse = await loomProvider.sendAsync(JSON.parse(jsonRPCString));
    return res.status(200).json({ result: 'ok', data: { net_version: jsonResponse } });
  } catch (err) {
    return res.status(400).json({ result: 'error', message: reducedErrorMessage(err) });
  }
};

exports.getMonitorSyncing = async (req, res) => {
  web3.eth.getBlockNumber((error, lastblock) => {
    if (error) return res.status(400).send({ result: 'error', message: reducedErrorMessage(error) });
    return ServiceInfoModel.findOne()
      .then(row => {
        if (row) {
          if ((lastblock === row.lastblock) && isOutOfSyncing(row.updatedAt)) {
            return res.status(400).send({ result: 'error', message: 'Out of syncing' });
          }

          return res.status(200).send({ result: 'ok' });
        }
        return res.status(400).send({ result: 'error', message: 'Db error occurred' });
      })
      .catch(err => res.status(400).send({ result: 'error', message: reducedErrorMessage(err) }));
  });
};

exports.getBlocks = function (req, res) {
  let offset = Number(req.query.offset);
  let count = Number(req.query.count);

  if (!offset) offset = 0;
  if (!count || count <= 0) count = 10;

  web3.eth.getBlockNumber(async function (error, number) {
    if (!error) {
      try {
        const blocks = [];
        for (let i = 0; i < count; i++) {
          const height = number - offset - i;
          if (height < 0) break;

          const blockdata = await web3.eth.getBlock(height, false);
          if (blockdata) blocks.push(blockdata);
        }

        return res.status(200).send({ result: 'ok', data: { total: number, blocks } });
      } catch (err) {
        return res.status(400).send({ result: 'error', message: reducedErrorMessage(err) });
      }
    } else {
      return res.status(400).send({ result: 'error', data: reducedErrorMessage(error) });
    }
  });
};

exports.getBlockDetails = async function (req, res) {
  let hash = req.params.hash;
  try {
    if (hash.length < 10) hash = Number(hash);
    const block = await web3.eth.getBlock(hash, true);

    return res.status(200).send({ result: 'ok', data: { block } });
  } catch (err) {
    return res.status(400).send({ result: 'error', message: reducedErrorMessage(err) });
  }
};

exports.getBlockByHash = async function (req, res) {
  let hash = req.params.hash;
  try {
    if (hash.length < 10) hash = Number(hash);
    const block = await web3.eth.getBlock(hash, false);
    return res.status(200).send({ result: 'ok', data: { block } });
  } catch (err) {
    return res.status(400).send({ result: 'error', message: reducedErrorMessage(err) });
  }
};

exports.getTransactionInfo = function (req, res) {
  const hash = req.params.hash;
  web3.eth.getTransaction(hash, async function (error, transaction) {
    if (error) {
      return res.status(400).send({ result: 'error', message: reducedErrorMessage(error) });
    }
    return res.status(200).send({ result: 'ok', data: { transaction } });
  });
};