/* global io */
'use strict';

angular.module('test1App')
  .factory('socket', function(socketFactory) {
    var retryInterval = 5000;
    var retryTimer;

    clearInterval(retryTimer);

    var ioSocket = io.connect('', {
      'force new connection': true,

      'max reconnection attempts': Infinity,

      'reconnection limit': 10 * 1000,

      // Send auth token on connection
      // 'query': 'token=' + Auth.getToken()
    });

    retryTimer = setInterval(function () {
      if (!ioSocket.socket.connected &&
          !ioSocket.socket.connecting &&
          !ioSocket.socket.reconnecting) {
        ioSocket.connect();
      }
    }, retryInterval);

    var socket = socketFactory({
      ioSocket: ioSocket
    });

    return {
      socket: socket,

      /**
       * Register listeners to sync an array with updates on a model
       *
       * Takes the array we want to sync, the model name that socket updates are sent from,
       * and an optional callback function after new items are updated.
       *
       * @param {String} modelName
       * @param {Array} array
       * @param {Function} cb
       */
      syncUpdates: function (modelName, array, cb) {
        cb = cb || angular.noop;

        /**
         * Syncs item creation/updates on 'model:save'
         */
        socket.on(modelName + ':save', function (item) {
          var oldItem = _.find(array, {_id: item._id});
          var index = array.indexOf(oldItem);
          var event = 'created';

          // replace oldItem if it exists
          // otherwise just add item to the collection
          if (oldItem) {
            array.splice(index, 1, item);
            event = 'updated';
          } else {
            array.push(item);
          }

          cb(event, item, array);
        });

        /**
         * Syncs removed items on 'model:remove'
         */
        socket.on(modelName + ':remove', function (item) {
          var event = 'deleted';
          _.remove(array, {_id: item._id});
          cb(event, item, array);
        });
      },

      /**
       * Removes listeners for a models updates on the socket
       *
       * @param modelName
       */
      unsyncUpdates: function (modelName) {
        socket.removeAllListeners(modelName + ':save');
        socket.removeAllListeners(modelName + ':remove');
      }
    };
  });