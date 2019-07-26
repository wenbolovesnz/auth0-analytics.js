/* global window, Auth0Lock */

// Safe require for babel-pollyfill
// See issue: https://github.com/auth0/auth0-analytics.js/issues/14
if (
  (typeof window !== "undefined" && !window["_babelPolyfill"]) ||
  (typeof global !== "undefined" && !global["_babelPolyfill"])
) {
  require("babel-polyfill");
}

import TagManager from "auth0-tag-manager";

let analytics;

const IGNORED_EVENTS = ["hash_parsed"];

function eventShouldBeIgnored(name) {
  if (typeof name !== "string")
    throw new Error("Lock event name must be a string.");

  return IGNORED_EVENTS.indexOf(name) !== -1;
}

function eventIsAvailable(lock, name) {
  if (typeof name !== "string")
    throw new Error("Lock event name must be a string.");

  return lock.validEvents.indexOf(name) !== -1;
}

function setupEvent(lock, name, tracker = analytics) {
  if (!eventIsAvailable(lock, name)) return;

  lock.on(name, function(payload) {
    if (
      name === "authenticated" &&
      payload &&
      payload.idTokenPayload &&
      payload.idTokenPayload.sub
    ) {
      tracker.setUserId(payload.idTokenPayload.sub);
    }

    const isAusSite = window.location.href.indexOf(".com.au") > 0;
    if (name === "signin") {
      name = "login";
    }
    let eventName = `auth0 ${isAusSite ? "AUS" : "NZ"} ${name}`;
    eventName = eventName.replace("signin", "login");
    eventName = eventName.replace("signup", "activate");
    eventName = eventName.replace(
      "forgot_password ready",
      "forgot_password clicked"
    );

    console.log(eventName);
    tracker.track(eventName, { category: "Auth0" });
  });
}

function init(lock) {
  if (!window.auth0AnalyticsOptions) {
    throw new Error(
      "You must provide initialization options for Auth0 Analytics."
    );
  }

  if (!window.auth0AnalyticsOptions.label) {
    const isAusSite = window.location.href.indexOf(".com.au") > 0;
    window.auth0AnalyticsOptions.label = isAusSite ? "Auth0 AUS" : "Auth0 NZ";
  }

  analytics = TagManager(window.auth0AnalyticsOptions);

  lock.validEvents.forEach(name => {
    if (eventShouldBeIgnored(name)) return; // Not needed for analytics
    setupEvent(lock, name);
  });
}

if (typeof Auth0Lock === "function") {
  let prototype = Auth0Lock.prototype;
  Auth0Lock = function() {
    let lock = prototype.constructor.apply(this, arguments);
    init(lock);
    return lock;
  };

  Auth0Lock.prototype = prototype;
}

module.exports = {
  IGNORED_EVENTS,
  eventShouldBeIgnored,
  eventIsAvailable,
  setupEvent,
  init
};
