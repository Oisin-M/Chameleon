Handlebars.registerHelper("toCapitalCase", function (str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
});

export function hasHistoryApi() {
  return !!(window.history && window.history.pushState);
}

Meteor.setInterval(function () {
  Session.set("time", new Date());
}, 1000);

FlashMessages.configure({
  autoHide: true,
  autoScroll: false,
});
