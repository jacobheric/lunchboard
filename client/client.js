//
//Local collections
searchResults = new Meteor.Collection();
mapMarkers = new Meteor.Collection();

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

Template.searchResult.searchResults = function() {
	return searchResults.find({});
};

Template.lunchboard.events = {
	'click a.inc': function() {
		Venues.update(Session.get("selected_venue"), {
			$inc: {
				score: 1
			}
		});
	},
	'click a.dec': function() {
		Venues.update(Session.get("selected_venue"), {
			$inc: {
				score: -1
			}
		});
	},
	'click a.dec': function() {
		Venues.update(Session.get("selected_venue"), {
			$inc: {
				score: -1
			}
		});
	}	
};

var popMapMarker = function (marker) {
	google.maps.event.trigger(marker, 'click');
};

Template.searchResult.events = {
	'click tr': function() {
	    var marker1 = markers[this.index];
	    var marker2 = mapMarkers.findOne({index: this.index});
		google.maps.event.trigger(marker1, 'click');
		popMapMarker(marker2);
	}
};


Template.venue.events = {
	'click': function() {
		Session.set("selected_venue", this._id);
	}
};

Meteor.startup(function () {
  Deps.autorun(function () {
		initialize();
  });
});


//
//Pure clientside code; does non-reactive restaurant search
var map, places, iw;
var markers = [];
var searchTimeout;
var centerMarker;
var autocomplete;
var hostnameRegexp = new RegExp('^https?://.+?/');

function initialize() {
	
	if (navigator.geolocation) {
		navigator.geolocation.getCurrentPosition(setupPage);
	} else {
	  error('not supported');
	}			
}

function setupPage(position){
	
	var curPos = new google.maps.LatLng(position.coords.latitude, position.coords.longitude);

	var myOptions = {
		zoom: 15,
		center: curPos,
		mapTypeId: google.maps.MapTypeId.ROADMAP
	}
	map = new google.maps.Map(document.getElementById('map_canvas'), myOptions);
	places = new google.maps.places.PlacesService(map);
	google.maps.event.addListener(map, 'tilesloaded', tilesLoaded);

	document.getElementById('keyword').onkeyup = function(e) {
		if (!e) var e = window.event;
		if (e.keyCode != 13) return;
		document.getElementById('keyword').blur();
		search(document.getElementById('keyword').value);
	}

	var rankBySelect = document.getElementById('rankBy');
	rankBySelect.onchange = function() {
		search();
	};			
	
}

function tilesLoaded() {
	search();
	google.maps.event.clearListeners(map, 'tilesloaded');
	google.maps.event.addListener(map, 'zoom_changed', searchIfRankByProminence);
	google.maps.event.addListener(map, 'dragend', search);
}

function searchIfRankByProminence() {
	if (document.getElementById('rankBy').value == 'prominence') {
		search();
	}
}

function search() {
	clearResults();
	clearMarkers();

	if (searchTimeout) {
		window.clearTimeout(searchTimeout);
	}
	searchTimeout = window.setTimeout(reallyDoSearch, 500);
}

function reallyDoSearch() {
	var keyword = document.getElementById('keyword').value;
	var rankBy = document.getElementById('rankBy').value;

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
		if (status == google.maps.places.PlacesServiceStatus.OK) {
			searchResults.remove({});
			for (var i = 0; i < results.length; i++) {
				var icon = 'icons/number_' + (i + 1) + '.png';	
				results[i]["index"] = i;			
				results[i]["icon"] = icon;
				results[i]["parityStyle"] = i % 2 == 0 ? "" : "parityOdd";
				var marker = new google.maps.Marker({
					position: results[i].geometry.location,
					animation: google.maps.Animation.DROP,
					icon: icon, 
					index: i
				}); 
				markers.push(marker);
				mapMarkers.insert(marker);
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

function addResult(result, i) {
	var results = document.getElementById('results');
	var tr = document.createElement('tr');
	tr.style.backgroundColor = (i % 2 == 0 ? '#F0F0F0' : '#FFFFFF');
	tr.onclick = function() {
		google.maps.event.trigger(markers[i], 'click');
	};

	var iconTd = document.createElement('td');
	var nameTd = document.createElement('td');
	var icon = document.createElement('img');
	icon.src = 'icons/number_' + (i + 1) + '.png';
	icon.setAttribute('class', 'placeIcon');
	icon.setAttribute('className', 'placeIcon');
	var name = document.createTextNode(result.name);
	iconTd.appendChild(icon);
	nameTd.appendChild(name);
	tr.appendChild(iconTd);
	tr.appendChild(nameTd);
	results.appendChild(tr);
}

function clearResults() {
	var results = document.getElementById('results');
	while (results.childNodes[0]) {
		results.removeChild(results.childNodes[0]);
	}
}

function getDetails(result, i) {
	return function() {
		places.getDetails({
			reference: result.reference
		}, showInfoWindow(i));
	}
}

function showInfoWindow(i) {
	return function(place, status) {
		if (iw) {
			iw.close();
			iw = null;
		}

		if (status == google.maps.places.PlacesServiceStatus.OK) {
			iw = new google.maps.InfoWindow({
				content: getIWContent(place)
			});
			iw.open(map, markers[i]);
		}
	}
}

function getIWContent(place) {
	var content = '';
	content += '<table>';
	content += '<tr class="iw_table_row">';
	content += '<td style="text-align: right"><img src="' + place.icon + '"/></td>';
	content += '<td><b><a href="' + place.url + '">' + place.name + '</a></b></td></tr>';
	content += '<tr class="iw_table_row"><td class="iw_attribute_name">Address:</td><td>' + place.vicinity + '</td></tr>';
	if (place.formatted_phone_number) {
		content += '<tr class="iw_table_row"><td class="iw_attribute_name">Telephone:</td><td>' + place.formatted_phone_number + '</td></tr>';
	}
	if (place.rating) {
		var ratingHtml = '';
		for (var i = 0; i < 5; i++) {
			if (place.rating < (i + 0.5)) {
				ratingHtml += '&#10025;';
			} else {
				ratingHtml += '&#10029;';
			}
		}
		content += '<tr class="iw_table_row"><td class="iw_attribute_name">Rating:</td><td><span id="rating">' + ratingHtml + '</span></td></tr>';
	}
	if (place.website) {
		var fullUrl = place.website;
		var website = hostnameRegexp.exec(place.website);
		if (website == null) {
			website = 'http://' + place.website + '/';
			fullUrl = website;
		}
		content += '<tr class="iw_table_row"><td class="iw_attribute_name">Website:</td><td><a href="' + fullUrl + '">' + website + '</a></td></tr>';
	}
	content += '</table>';
	return content;
}

