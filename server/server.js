
Meteor.publish("venues", function () {
	
	return Venues.find({},{
		sort: {
			score: -1,
			name: 1
		}
	});
});