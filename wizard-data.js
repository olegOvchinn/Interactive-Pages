/* Shared local-storage data layer for the troubleshooting wizards.
   Tracks page visits, "Issue Resolved" clicks, and per-issue notes/comments.
   Everything here is stored in this browser's localStorage only — it is not
   shared across other computers or people opening the same files. */
(function (global) {
  var EVENTS_KEY = 'stw_events_v1';
  var COMMENTS_KEY = 'stw_comments_v1';
  var MAX_EVENTS = 5000;

  function readJSON(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      if (raw == null) return fallback;
      var parsed = JSON.parse(raw);
      return parsed == null ? fallback : parsed;
    } catch (e) {
      return fallback;
    }
  }
  function writeJSON(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* storage unavailable */ }
  }

  function logEvent(entry) {
    var events = readJSON(EVENTS_KEY, []);
    events.push(Object.assign({ ts: Date.now() }, entry));
    if (events.length > MAX_EVENTS) events.splice(0, events.length - MAX_EVENTS);
    writeJSON(EVENTS_KEY, events);
  }
  function readEvents() { return readJSON(EVENTS_KEY, []); }
  function clearEvents() { writeJSON(EVENTS_KEY, []); }

  function commentKey(page, step) { return page + '::' + step; }
  function getComment(page, step) {
    var all = readJSON(COMMENTS_KEY, {});
    var entry = all[commentKey(page, step)];
    return entry ? entry.text : '';
  }
  function setComment(page, step, text) {
    var all = readJSON(COMMENTS_KEY, {});
    var key = commentKey(page, step);
    if (text && text.trim()) {
      all[key] = { text: text, ts: Date.now() };
    } else {
      delete all[key];
    }
    writeJSON(COMMENTS_KEY, all);
  }
  function allComments() { return readJSON(COMMENTS_KEY, {}); }
  function clearComments() { writeJSON(COMMENTS_KEY, {}); }

  function clearAll() { clearEvents(); clearComments(); }

  global.STW = {
    logEvent: logEvent,
    readEvents: readEvents,
    clearEvents: clearEvents,
    getComment: getComment,
    setComment: setComment,
    allComments: allComments,
    clearComments: clearComments,
    clearAll: clearAll
  };
})(window);
