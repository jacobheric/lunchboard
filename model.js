/*
	Venues currently only consist of name & score
*/
Venues = new Meteor.Collection("venues");

Venues.allow({
  insert: function () {
    return false; // use createVenue function only
  },
  update: function () {
    return false;
  },
  remove: function () {
	return false;
  }
});


Meteor.methods({
	
	//
	//These abstractions, as such, are pointless. But,they set us for security, loose coupling going forward.
	createVenue: function (venue) {
		Venues.insert(venue);
	},
	removeVenue: function (id) {
		Venues.remove(id);
	}, 
	decrementVenue: function(id){
		var v = Venues.findOne(id); 
		
		if (v && v.score > 0){
			Venues.update(v._id, {
				$inc: {
					score: -1
				}
			});
		}			
	},
	incrementVenue: function(id){
		var v = Venues.findOne(id); 
		
		if (v){
			Venues.update(v._id, {
				$inc: {
					score: 1
				}
			});
		}			
	}	
});