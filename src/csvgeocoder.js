window.onload = init;var map; var markers=undefined;
var tabData=undefined; var gridOptions=undefined; var selectedCol = {'geocoding':[], 'content':[]};
var geocoders = undefined;


function init(){
	// Files
	files = document.getElementById('files');
	document.querySelector('#geoDownloader').disabled = true;
    document.getElementById("fileUploader").addEventListener("click", function(){
		if(files){ files.click(); }
	}, false);
	files.addEventListener('change', handleFiles, false);
	// Map
    map = L.map('map').setView([45, 3], 5);markers = L.featureGroup([]);
    L.tileLayer('https://{s}.tile.openstreetmap.fr/osmfr/{z}/{x}/{y}.png', {attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'}).addTo(map);
    document.getElementById("mapDisplayer").addEventListener("click", displayMap);
	displayMap(undefined);
	// Set geocoders
	fetch('geocoders.json')
		.then(r=>r.json())
		.then(r=>{
			geocoders = r;
			var geocodersInput = document.querySelector('#geocodersInput');
			for(elem in geocoders){
				if(!geocoders[elem].url.includes('YOUR_ACCESS_KEY')){
					let htmlElements = createGeoRadioInput(elem, geocoders[elem].name);
					geocodersInput.append(htmlElements[0], htmlElements[1]);
				}
			  }
		})
}

function createGeoRadioInput(shortName, name){
	var input = document.createElement('input');
	input.type = 'radio';
	input.name = 'geocoder';
	input.value = shortName;
	var label = document.createElement('label');
	label.for = shortName;
	label.innerText = name;
	return [input, label];
}

function handleFiles(){
	if(!this.files.length){
		alert('No files given');
	}else{
		selectedCol = {'geocoding':[], 'content':[]};
		Papa.parse(document.querySelector("#files").files[0], {
			delimiter: ";", header: true,
			error: function(err, file){ console.error("ERROR:", err, file); },
			complete: function(results){ displayHTMLTable(results); }
		});
	}
}

function newRow(tabHeader){
    var row = {};
    tabHeader.forEach(col => {row[col['field']]= '';});
    return row;
}

function getGeocoder(){
	var geocodersInput = document.querySelectorAll('input[name="geocoder"]');
	for(let i=0; i < geocodersInput.length; i++){
		if(geocodersInput[i].checked){return geocoders[geocodersInput[i].value];}
	}
	return geocoders['ban'];
}

function displayHTMLTable(results){
    tabData = results.data;
	setTabOptions();
	document.querySelector('input[value="ban"]').checked = true;
	document.querySelector('#optionsPopup').classList.add('is-active');
	document.querySelector('#optionsClose').addEventListener('click', closeOptPopup);
	document.querySelector('#geocoderBtn').addEventListener('click', function(){
		// Get selected geocoder
		var geocoderData = getGeocoder();
		// Init grid
		var tabHeader = [{headerName: "N°", field: "nm", filter: "agNumberColumnFilter"}];
		results.meta.fields.forEach(field => {
			tabHeader.push({headerName: field, field: field, filter: "agTextColumnFilter"});
		});
		var extendedHeader = [
			{headerName:"Longitude", field:"lng", filter: "agNumberColumnFilter"},
			{headerName:"Latitude", field:"lat", filter: "agNumberColumnFilter"},
			{headerName:"Label", field:"label", filter: "agTextColumnFilter"}
			
		];
		if(geocoderData.schema.score !== null){
			extendedHeader.push({headerName:"Score", field:"score", filter: "agNumberColumnFilter"});
		}
		tabHeader = tabHeader.concat(extendedHeader);
		var rowData= [];
		gridOptions = {
			defaultColDef: {
				sortable: true,
				resizable: true,
			},
			columnDefs: tabHeader,
			rowData: rowData
		};
		document.querySelector("#gridTab").innerHTML = '';
		new agGrid.Grid(document.querySelector("#gridTab"), gridOptions);
		document.querySelector('#gridTab').classList.add('is-active');
		// Init HTML related elements
		document.querySelector('#geoDownloader').addEventListener('click', exportDataAsCsv);
		document.querySelector('#geoDownloader').classList.remove('is-disable');
		// Clear map
		markers.clearLayers();
		// Fill the table
		for(i=0;i<tabData.length-1;i++){
			var cells = tabData[i]
			var row = newRow(tabHeader);
			Object.keys(cells).forEach(key=>{
				row[key] = cells[key];
			});
			row['nm'] = i+1;
			rowData.push(row);
			geocode(cells, row, gridOptions, geocoderData);
		}
	});

	
}

function closeOptPopup(){
	document.querySelector('#optionsPopup').classList.remove('is-active');
	document.querySelector('#optionsClose').removeEventListener('click', closeOptPopup);
}

function newCheckbox(value, i, type){
	let bx = document.createElement('input');
	bx.type = 'checkbox';
	bx.name = type+'check'+i;
	bx.value = value;
	bx.addEventListener('change', function(){checkboxChange(this);});
	return bx;
}

function newOptRow(key, i){
	var r = document.createElement('tr');
	// Label
	let tdLabel = document.createElement('td');
	tdLabel.innerHTML = key;
	r.appendChild(tdLabel);
	// Geocoding
	let tdG = document.createElement('td');
	tdG.appendChild(newCheckbox(key, i, 'geocoding'));
	r.appendChild(tdG);
	// Content
	let tdC = document.createElement('td');
	tdC.appendChild(newCheckbox(key, i, 'content'));
	r.appendChild(tdC);
	return r;
}

function setTabOptions(){
	if(typeof tabData != 'undefined'){
		var optTable = document.querySelector('#geocodingOptions');
		optTable.innerHTML = '';
		var i = 1;
		Object.keys(tabData[0]).forEach(key=>{
			optTable.appendChild(newOptRow(key, i));i++;
        });
		document.querySelector('#optionsPopup').style.height = 100 + (50*Object.keys(tabData[0]).length)+'px';
	}
}

function checkboxChange(target){
	if(selectedCol[target.name.split('check')[0]].includes(target.value)){
		const idx = selectedCol[target.name.split('check')[0]].indexOf(target.value);
		if(idx > -1){selectedCol[target.name.split('check')[0]].splice(idx, 1);}
	}else{
		selectedCol[target.name.split('check')[0]].push(target.value);
	}
}

function getJSONValue(obj, idx, keys){
  if(idx == keys.length-1){ return obj[keys[idx]]; }
  return getJSONValue(obj[keys[idx]], idx+1, keys);
}

function geocode(cells, row, gridOptions, geocoderData){
	var adress = ""; var schema = geocoderData.schema;
	if(typeof tabData != 'undefined' && selectedCol['geocoding'].length > 0){
		for(j=0;j<selectedCol['geocoding'].length;j++){
			if(cells[selectedCol['geocoding'][j]] != ''){adress+=cells[selectedCol['geocoding'][j]]+" ";}
		}
		fetch(geocoderData.url+adress.slice(0, adress.length-1))
		.then(r=>r.json())
		.then(r=>{
			var imax=0;var scoremax=0;var feature;
			if(r[schema.results].length > 0){
				// Get the feature
				if(geocoderData.schema.score !== null){
					for(let k=0; k < r[schema.results].length; k++){
						var current = getJSONValue(r[schema.results][k], 0, schema.score);
						if(current > scoremax){ scoremax = current; imax = k;}
					}	
				}
				feature = r[schema.results][imax];
				// Process with the feature
				row['lng']= getJSONValue(feature, 0, schema.lng);
				row['lat']= getJSONValue(feature, 0, schema.lat);
				row['label']= getJSONValue(feature, 0, schema.label);
				if(geocoderData.schema.score !== null){
					row['score'] = getJSONValue(feature, 0, schema.score).toFixed(3);
				}
				// Set marker content
				var content = "";
				for(k=0;k<selectedCol['content'].length;k++){
					content+="<p><strong>"+selectedCol['content'][k]+"</strong>: "+cells[selectedCol['content'][k]]+"</p>";
				}
				console.log(content);
				const marker = L.marker([row['lat'], row['lng']], {title: cells[selectedCol['content'][0]]}).bindPopup(content)
				markers.addLayer(marker);markers.addTo(map);
				// Add to the table
				gridOptions.api.applyTransaction({add: [row]});
			}else{
				row['lng']= null;
				row['lat']= null;
				row['label']='';
				row['score']=0;	
			}
			closeOptPopup();
			document.querySelector('#geoDownloader').disabled = false;
			
		})
	}
}

function displayMap(event){
	if(typeof event != 'undefined'){event.preventDefault();}
	let mapDiv = document.querySelector('#map-div');
	if(!mapDiv.classList.contains('is-active')){mapDiv.classList.add("is-active");}
	document.getElementById("mapDisplayer").innerHTML = '<img src="assets/targetWhite.svg"> Center map';
	if(markers.getLayers().length>0){map.fitBounds(markers.getBounds());}
	else{map.setView(new L.latLng(45, 3), 5);}
    document.getElementById("hide-map").addEventListener("click", hideMap);
}

function hideMap(){
    document.getElementById("map-div").classList.remove("is-active");
    document.getElementById("hide-map").removeEventListener("click", hideMap);
	document.getElementById("mapDisplayer").innerHTML = '<img src="assets/map.svg"> Display map';
}

function exportDataAsCsv(e){
	e.preventDefault();
	var params = {allColumns: true};
	gridOptions.api.exportDataAsCsv(params);
}