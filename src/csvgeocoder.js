window.onload = init;var map;var markers=undefined;var tabData=undefined;var gridOptions=undefined;selectedCol = {'geocode':[], 'content':[]};




function init(){
	document.querySelector('#geodownload').disabled = true;
    document.getElementById("upload-file").addEventListener("click", function(e){
        e.preventDefault();
        Papa.parse(document.querySelector("#files").files[0], {
            delimiter: ";",header: true,
            error: function(err, file){console.error("ERROR:", err, file)},
            complete: function(results){displayHTMLTable(results);console.log("Done with all files")}
        });
    })
    map = L.map('map').setView([45, 3], 5);markers = L.featureGroup([]);
    L.tileLayer('https://{s}.tile.openstreetmap.fr/osmfr/{z}/{x}/{y}.png', {attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'}).addTo(map);
    document.getElementById("display-map").addEventListener("click", displayMap);
	displayMap(undefined);

	document.querySelector('#burger-open').addEventListener("click", function(){
		document.querySelector('#burger-open').classList.remove("is-active");
		document.querySelector('#burger-close').classList.add("is-active");
	});
	document.querySelector('#burger-close').addEventListener("click", function(){
		document.querySelector('#burger-close').classList.remove("is-active");
		document.querySelector('#burger-open').classList.add("is-active");
	});
}

function newRow(tabHeader){
    var row = {};
    tabHeader.forEach(col => {row[col['field']]= '';});
    return row;
}

function displayHTMLTable(results){
    tabData = results.data;
    var tabHeader = [{headerName: "N°", field: "nm", filter: "agNumberColumnFilter"}];
    results.meta.fields.forEach(field => {
        tabHeader.push({headerName: field, field: field, filter: "agTextColumnFilter"});
    });
    var extendedHeader = [
        {headerName:"Longitude", field:"lng", filter: "agNumberColumnFilter"},
        {headerName:"Latitude", field:"lat", filter: "agNumberColumnFilter"},
        {headerName:"Label", field:"label", filter: "agTextColumnFilter"},
        {headerName:"Score", field:"score", filter: "agNumberColumnFilter"}
    ];
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

	setTabOptions();
	document.querySelector('#tab-opt-popup').classList.add('is-displayed');
	document.querySelector('#close-popup-opt').addEventListener('click', closeOptPopup);
	document.querySelector('#geodownload').addEventListener('click', exportDataAsCsv);
	
	document.querySelector('#btn-geocode').addEventListener('click', function(){
		document.querySelector("#grid-tab").innerHTML = '';
		new agGrid.Grid(document.querySelector("#grid-tab"), gridOptions);
		markers.clearLayers();
		for(i=0;i<tabData.length-1;i++){
			var cells = tabData[i]
			var row = newRow(tabHeader);
			Object.keys(cells).forEach(key=>{
				row[key] = cells[key];
			});
			row['nm'] = i+1;
			rowData.push(row);
			geocoder(cells, row, gridOptions);
		} 
	});
}

function closeOptPopup(){
	document.querySelector('#tab-opt-popup').classList.remove('is-displayed');
	document.querySelector('#close-popup-opt').removeEventListener('click', closeOptPopup);
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
	tdG.appendChild(newCheckbox(key, i, 'geocode'));
	r.appendChild(tdG);
	// Content
	let tdC = document.createElement('td');
	tdC.appendChild(newCheckbox(key, i, 'content'));
	r.appendChild(tdC);
	return r;
}

function setTabOptions(){
	if(typeof tabData != 'undefined'){
		var optTable = document.querySelector('#geocoder-options');
		optTable.innerHTML = '';
		var i = 1;
		Object.keys(tabData[0]).forEach(key=>{
			optTable.appendChild(newOptRow(key, i));i++;
        });
		document.querySelector('#tab-opt-popup').style.height=80+(50*Object.keys(tabData[0]).length)+'px';
	}
}

function checkboxChange(target){
	if(selectedCol[target.name.split('check')[0]].includes(target.value)){
		//target.checked = false;
		const idx = selectedCol[target.name.split('check')[0]].indexOf(target.value);
		if(idx > -1){selectedCol[target.name.split('check')[0]].splice(idx, 1);}
	}else{
		//target.checked = true;
		selectedCol[target.name.split('check')[0]].push(target.value);
	}
}

function geocoder(cells, row,  gridOptions){
	var adress = "";
	if(typeof tabData != 'undefined' && selectedCol['geocode'].length > 0){
		for(j=0;j<selectedCol['geocode'].length;j++){
			if(cells[selectedCol['geocode'][j]] != ''){adress+=cells[selectedCol['geocode'][j]]+" ";}
		}
		fetch('http://api-adresse.data.gouv.fr/search/?q='+adress.slice(0, adress.length-1)).then(r=>r.json())
		.then(r=>{
			var imax=0;var scoremax=0;
			if(r["features"].length > 0){
				for(let k=0; k < r["features"].length; k++){
					if(r["features"][k]["properties"]["score"] > scoremax){scoremax = r["features"][k]["properties"]["score"];imax = k;}
				}
				var bestFeat = r["features"][imax];
				row['lng']= bestFeat['geometry']['coordinates'][0];
				row['lat']= bestFeat['geometry']['coordinates'][1];
				row['label']=bestFeat['properties']['label'];
				row['score']= bestFeat['properties']['score'].toFixed(3);
				var content = "";
				for(k=0;k<selectedCol['content'].length;k++){
					content+="<p><strong>"+selectedCol['content'][k]+"</strong>: "+cells[selectedCol['content'][k]]+"</p>";
				}
				const marker = L.marker([row['lat'], row['lng']], {title: cells[selectedCol['content'][0]]}).bindPopup(content)
				markers.addLayer(marker);markers.addTo(map);
				gridOptions.api.applyTransaction({add: [row]});
			}
			else{
				//console.warn("No result found with "+tabData[idx]);
				row['lng']= null;
				row['lat']= null;
				row['label']='';
				row['score']=0;	
			}
			closeOptPopup();
			document.querySelector('#geodownload').disabled = false;
		})
	}
}

function displayMap(event){
	if(typeof event != 'undefined'){event.preventDefault();}
	let mapDiv = document.querySelector('#map-div');
	if(!mapDiv.classList.contains('is-displayed')){mapDiv.classList.add("is-displayed");}
	document.getElementById("display-map").innerHTML = '<img src="assets/targetWhite.svg"> Center map';
	if(markers.getLayers().length>0){map.fitBounds(markers.getBounds());}
	else{map.setView(new L.latLng(45, 3), 5);}
    document.getElementById("hide-map").addEventListener("click", hideMap);
}

function hideMap(){
    document.getElementById("map-div").classList.remove("is-displayed");
    document.getElementById("hide-map").removeEventListener("click", hideMap);
	document.getElementById("display-map").innerHTML = '<img src="assets/map.svg"> Display map';
}

function exportDataAsCsv(e){
	e.preventDefault();
	var params = {allColumns: true};
	gridOptions.api.exportDataAsCsv(params);
}