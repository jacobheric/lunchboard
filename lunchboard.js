// Set up a collection to contain venue information. On the server,
// it is backed by a MongoDB collection named "venues."

Venues = new Meteor.Collection("venues");

if (Meteor.is_client) {
  Template.lunchboard.venues = function () {
    return Venues.find({}, {sort: {score: -1, name: 1}});
  };

  Template.lunchboard.selected_name = function () {
    var venue = Venues.findOne(Session.get("selected_venue"));
    return venue && venue.name;
  };

  Template.venue.selected = function () {
    return Session.equals("selected_venue", this._id) ? "selected" : '';
  };

  Template.lunchboard.events = {
    'click input.inc': function () {
      Venues.update(Session.get("selected_venue"), {$inc: {score: 1}});
    }
  };

  Template.venue.events = {
    'click': function () {
      Session.set("selected_venue", this._id);
    }
  };
}

// On server startup, create some venues if the database is empty.
if (Meteor.is_server) {
  Meteor.startup(function () {
    if (Venues.find().count() === 0) {
      var names = ["The Grill Room",
                   "Taco Escobar",
                   "Sebago",
                   "Duckfat",
                   "The Corner Room",
                   "Sonnys"];
      for (var i = 0; i < names.length; i++)
        Venues.insert({name: names[i], score: 0});
    }
  });
}
