const SocketClient = (() => {
  let socket = null;
  const listeners = {};

  function connect() {
    if (socket && socket.connected) return;
    socket = io(window.location.origin, {
      transports: ['websocket', 'polling'],
    });
    socket.on('connect', () => {
      console.log('WebSocket connected');
    });
    socket.on('disconnect', () => {
      console.log('WebSocket disconnected');
    });
    Object.keys(listeners).forEach(event => {
      socket.on(event, listeners[event]);
    });
  }

  function on(event, callback) {
    listeners[event] = callback;
    if (socket) socket.on(event, callback);
  }

  function off(event) {
    delete listeners[event];
    if (socket) socket.off(event);
  }

  function disconnect() {
    if (socket) {
      socket.disconnect();
      socket = null;
    }
  }

  return { connect, on, off, disconnect };
})();
