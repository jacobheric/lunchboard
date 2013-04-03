//
//Subscriptions
Meteor.subscribe("venues");

//
//Local collections
searchResults = new Meteor.Collection(null);
// TODO: Map markers in meteor collection aren't working properly; revisit
//mapMarkers = new Meteor.Collection();

//
//Pure clientside code; does non-reactive restaurant search
var map, places, iw;
var markers = [];
var searchTimeout;
var centerMarker;
var curPos;

Meteor.startup(function () {
  Deps.autorun(function () {
		//initialize();
  });
});

Template.lunchboard.venues = function() {
	return Venues.find({},{
		sort: {
			score: -1,
			name: 1
		}
	});
};

Template.venue.selected = function() {
	return Session.equals("selected_venue", this._id) ? "selected" : '';
};

Template.venue.events = {
	'click': function() {
		Session.set("selected_venue", this._id);
	},
	'click img': function() {
		Meteor.call('removeVenue', this._id);
	}
};

Template.header.events = {
	'click a.inc': function() {
		Meteor.call('incrementVenue', Session.get("selected_venue"));
	},
	'click a.dec': function() {
		Meteor.call('decrementVenue', Session.get("selected_venue"));
	}	
};

Template.searchResult.searchResults = function() {
	return searchResults.find({});
};

Template.searchResult.events = {
	'click td.info': function() {
	    var marker = markers[this.index];
		//Not working
	    //var marker2 = mapMarkers.findOne({index: this.index});
		if (marker){
			popMapMarker(marker);
		}
	},
	'click td.add': function(event, template) {
	 	v = Venues.findOne({name: this.name});
		if (!v){
			Meteor.call('createVenue', 
			{
				name: this.name,
				score: 0
			});			
		}		

	}	
};

Template.search.events = {
	'keyup input.searchBox': function(event, template) {
		if (event.keyCode === 13){ 
			var element = template.find(".searchBox");
			element.blur();
			search(element.value);
		}
	},
	'change select.searchRank': function() {
		search();
	}	
};

Template.mapCanvas.rendered = function() {

	var t = this;
	
	if (navigator.geolocation) {
		navigator.geolocation.getCurrentPosition(			
			function(position){
				var cPos = new google.maps.LatLng(position.coords.latitude, position.coords.longitude);	
				var myOptions = {
					zoom: 15,
					center: cPos,
					mapTypeId: google.maps.MapTypeId.ROADMAP
				}
				map = new google.maps.Map(t.find(".mapCanvas"), myOptions);
				places = new google.maps.places.PlacesService(map);		
				google.maps.event.addListener(map, 'tilesloaded', tilesLoaded);				
			}
		);
	} else {
	  error('geolocation not supported');
	}	
}


var popMapMarker = function (marker) {
	google.maps.event.trigger(marker, 'click');
};


var tilesLoaded = function tilesLoaded() {
	search();
	google.maps.event.clearListeners(map, 'tilesloaded');
	google.maps.event.addListener(map, 'zoom_changed', searchIfRankByProminence);
	google.maps.event.addListener(map, 'dragend', search);
}

function searchIfRankByProminence() {
	if (document.getElementById('searchRank').value == 'prominence') {
		search();
	}
}

function search() {
	clearMarkers();

	if (searchTimeout) {
		window.clearTimeout(searchTimeout);
	}
	searchTimeout = window.setTimeout(doSearch, 500);
}

function doSearch() {
	var keyword = document.getElementById('searchBox').value;
	var rankBy = document.getElementById('searchRank').value;
	var addVenues = Venues.find().count() === 0;

	var search = {};
	search.types = ['restaurant', 'cafe', 'bar', 'food'];	

	if (keyword) {
		search.keyword = keyword;
	}

	if (rankBy == 'distance' && (search.types || search.keyword)) {
		search.rankBy = google.maps.places.RankBy.DISTANCE;
		search.location = map.getCenter();
		centerMarker = new google.maps.Marker({
			position: search.location,
			animation: google.maps.Animation.DROP,
			map: map
		});
	} else {
		search.bounds = map.getBounds();
	}

	places.search(search, function(results, status) {
		searchResults.remove({});		
		if (status == google.maps.places.PlacesServiceStatus.OK) {
			for (var i = 0; i < results.length; i++) {
				var icon = 'icons/mapmark_' + (i + 1) + '.png';	
				results[i]["index"] = i;			
				results[i]["icon"] = icon;
				results[i]["parityStyle"] = i % 2 == 0 ? "" : "parityOdd";
				
				if (addVenues && i < 5){
					Venues.insert({
							name: results[i].name,
							score: 0
						});
				}
				
				var marker = new google.maps.Marker({
					position: results[i].geometry.location,
					animation: google.maps.Animation.DROP,
					icon: icon, 
					index: i
				}); 
				markers.push(marker);
				//
				//Not currently working
				//mapMarkers.insert(marker);
				google.maps.event.addListener(marker, 'click', getDetails(results[i], i));
				window.setTimeout(dropMarker(i), i * 100);
				searchResults.insert(results[i]);				
			}						
		}
	});
}

function clearMarkers() {
	for (var i = 0; i < markers.length; i++) {
		markers[i].setMap(null);
	}
	markers = [];
	if (centerMarker) {
		centerMarker.setMap(null);
	}
}

function dropMarker(i) {
	return function() {
		if (markers[i]) {
			markers[i].setMap(map);
		}
	}
}


function getDetails(result, i) {
	return function() {
		places.getDetails({
			reference: result.reference
		}, showInfoWindow(i));
	}
}

var ratingHtml = function getRatingHtml(place){
	var ratingHtml = '';	
	
	if (place.rating) {
		for (var i = 0; i < 5; i++) {
			if (place.rating < (i + 0.5)) {
				ratingHtml += '&#10025;';
			} else {
				ratingHtml += '&#10029;';
			}
		}
	}
	return ratingHtml;
}

function showInfoWindow(i) {
	return function(place, status) {
		
		if (iw) {
			iw.close();
			iw = null;
		}		
		
		if (status == google.maps.places.PlacesServiceStatus.OK) {;
			place['ratingHtml'] = ratingHtml(place);
			iw = new google.maps.InfoWindow({
				content: Template.infoWindow(place)
			});
			iw.open(map, markers[i]);
		}
		
	}
}