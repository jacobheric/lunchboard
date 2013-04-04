// 
//All events
Meteor.publish('events', function () {
  return Events.find();
});

// 
//Only venues relevant for specified event
Meteor.publish('venues', function (id) {
  return Venues.find({event_id: id}, {
		sort: {
			score: -1,
			name: 1
		}
	});
});
