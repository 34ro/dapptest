var private = {}, self = null,
	library = null, modules = null;

function Message(cb, _library) {
	self = this;
	self.type = 7
	library = _library;
	cb(null, self);
}

Message.prototype.create = function (data, trs) {
	return trs;
}

Message.prototype.calculateFee = function (trs) {
	return 100000000;
}

Message.prototype.verify = function (trs, sender, cb, scope) {

    // Check if message length is greater than 320 characters
    if (trs.asset.message.length > 320) {
        return setImmediate(cb, "Max length of message is 320 characters");
    }
    //setImmediate(cb, null, trs);
}

Message.prototype.getBytes = function (trs) {
    //return null;
    return new Buffer(trs.asset.message, 'hex');
}

Message.prototype.apply = function (trs, sender, cb, scope) {
    //setImmediate(cb);

    modules.blockchain.accounts.mergeAccountAndGet({
        address: sender.address,
    balance: -trs.fee
    }, cb);
}

Message.prototype.undo = function (trs, sender, cb, scope) {
    //setImmediate(cb);

    modules.blockchain.accounts.undoMerging({
        address: sender.address,
    balance: -trs.fee
    }, cb);
}

Message.prototype.applyUnconfirmed = function (trs, sender, cb, scope) {
    //setImmediate(cb);
    if (sender.u_balance < trs.fee) {
        return setImmediate(cb, "Sender doesn't have enough coins");
    }

    modules.blockchain.accounts.mergeAccountAndGet({
        address: sender.address,
    u_balance: -trs.fee
    }, cb);
}

Message.prototype.undoUnconfirmed = function (trs, sender, cb, scope) {
    //setImmediate(cb);

    modules.blockchain.accounts.undoMerging({
        address: sender.address,
    u_balance: -trs.fee
    }, cb);
}

Message.prototype.ready = function (trs, sender, cb, scope) {
	setImmediate(cb);
}

Message.prototype.save = function (trs, cb) {
    //setImmediate(cb);
    modules.api.sql.insert({
        table: "asset_messages",
    values: {
        transactionId: trs.id,
    message: trs.asset.message
    }
    }, cb);
}

Message.prototype.dbRead = function (row) {
    //return null;

    if (!row.tm_transactionId) {
        return null;
    } else {
        return {
            message: row.tm_message
        };
    }
}

Message.prototype.normalize = function (asset, cb) {
	//setImmediate(cb);

    // Call validator on our asset object
    library.validator.validate(asset, {
        type: "object", // It is an object
    properties: {
        message: { // It contains a message property
            type: "string", // It is a string
    format: "hex", // It is in a hexadecimal format
    minLength: 1 // Minimum length of string is 1 character
        }
    },
    required: ["message"] // Message property is required and must be defined
    }, cb);
}

Message.prototype.onBind = function (_modules) {
	modules = _modules;
	modules.logic.transaction.attachAssetType(self.type, self);
}


Message.prototype.add = function (cb, query) {
    // Validate query object
    library.validator.validate(query, {
        type: "object",
        properties: {
            recipientId: {
                type: "string",
                minLength: 1,
                maxLength: 21
            },
            secret: {
                type: "string",
                minLength: 1,
                maxLength: 100
            },
            message: {
                type: "string",
                minLength: 1,
                maxLength: 160
            }
        }
    }, function (err) {
        // If error exists, execute callback with error as first argument
        if (err) {
            return cb(err[0].message);
        }
    });
}


Message.prototype.add = function (cb, query) {

// Validate query object
    library.validator.validate(query, {
        type: "object",
        properties: {
            recipientId: {
                type: "string",
                minLength: 1,
                maxLength: 21
            },
            secret: {
                type: "string",
                minLength: 1,
                maxLength: 100
            },
            message: {
                type: "string",
                minLength: 1,
                maxLength: 160
            }
        }
    }, function (err) {
        // If error exists, execute callback with error as first argument
        if (err) {
            return cb(err[0].message);
        }
    });

    var keypair = modules.api.crypto.keypair(query.secret);


    // Get account
    modules.blockchain.accounts.getAccount({
        publicKey: keypair.publicKey.toString('hex')
    }, function (err, account) {
        // If error occurs, call cb with error argument
        if (err) {
            return cb(err);
        }
    });

    // Create new transaction
    try {
        var transaction = library.modules.logic.transaction.create({
            type: self.type,
            message: query.message,
            recipientId: query.recipientId,
            sender: account,
            keypair: keypair
        });
    } catch (e) {
        // Catch error if something goes wrong
        return setImmediate(cb, e.toString());
    }

    // Send transaction for processing
    modules.blockchain.transactions.processUnconfirmedTransaction(transaction, cb);
}

Message.prototype.list = function (cb, query) {
}
module.exports = Message;
