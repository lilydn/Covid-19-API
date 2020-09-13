const appState = {
  currentRegion: 'global', /* global/asia/europe/africa/americas/oceania */
  currentStatsType: '', /* confirmed/recovered/critical/deceased */
  loading: false,
  globalCovid: {
    totalConfirmedCases: 0,
    totalActiveCases: 0,
    totalRecovered: 0,
    totalDeaths: 0,
    countriesArray: [],
  }
}


const world = {
  asia: {
    totalConfirmedCases: 0,
    totalActiveCases: 0,
    totalRecovered: 0,
    totalDeaths: 0,
    countriesArray: [],
  },
  europe: {
    totalConfirmedCases: 0,
    totalActiveCases: 0,
    totalRecovered: 0,
    totalDeaths: 0,
    countriesArray: [],
  },
  africa: {
    totalConfirmedCases: 0,
    totalActiveCases: 0,
    totalRecovered: 0,
    totalDeaths: 0,
    countriesArray: [],
  },
  americas: {
    totalConfirmedCases: 0,
    totalActiveCases: 0,
    totalRecovered: 0,
    totalDeaths: 0,
    countriesArray: [],
  },
  oceania: {
    totalConfirmedCases: 0,
    totalActiveCases: 0,
    totalRecovered: 0,
    totalDeaths: 0,
    countriesArray: [],
  },
}


/* - - - - - - - - - - - - - - fetch functions - - - - - - - - - - - - */

const baseCovidEndpoint = 'https://corona-api.com';
const countriesByRegionEndpoint = 'https://restcountries.herokuapp.com/api/v1';
// const proxyUrl = 'https://cors-anywhere.herokuapp.com/';
const proxyUrl = 'https://api.allorigins.win/raw?url=';


async function fetchCountriesByRegion(region) {
  const regionq = (region === 'global') ? '' : `/region/${region}`; 
  // const regionq = `/region/${region}`;
  const response = await fetch(`${proxyUrl}${countriesByRegionEndpoint}${regionq}`);
  return handleErrors(response);
}

async function fetchCountryCovidData(countryCode) {
  const response = await fetch(`${baseCovidEndpoint}/countries/${countryCode}?include=timeline`);
  return handleErrors(response);
}

async function fetchGlobalCovidData() {
  const response = await fetch(`${baseCovidEndpoint}/timeline`);
  return handleErrors(response);
}

async function handleErrors(response) {
  if (response.ok) {
    const jsonResponse = await response.json();
    return jsonResponse;
  } else {
    console.log('OH NO!');
    throw response;
  }
}

/* - - - - - - - - - - - get and organize data - - - - - - - - - - - - */
 
// for each continent create an object for each country in the continent
// for each continent fill each country with covid data using the country code 
async function initWorld(continents) {
  continents.forEach(async continent => {
    await getContinentData(continent);
    await getCovidData(continent);
  });
}

// fetch data from the countries api
async function getContinentData(continent) {
  const continentData = await fetchCountriesByRegion(continent);
  continentData.forEach(country => {
    fillCountriesArray(country, continent);
  });
}

// fill the array of countries in each continent
function fillCountriesArray(country,continent) {
  const countryObj = {
    name: country.name.common,
    code: country.cca2,
  }
  world[continent].countriesArray.push(countryObj);
}

// fetch data from the covid api
async function getCovidData(continent) {
  world[continent].countriesArray.forEach(async country => {
    if(country.code !== 'XK') {  //XK (Kosovo) doesnt exist in covid API
      //TODO how to handle error correctly and not hard code XK ?
      const covidData = await fetchCountryCovidData(country.code); 
      fillCountriesCovidData(country, covidData);
      fillContinentCovidData(country, continent, covidData);
    }
  });
}

// get current global total stats 
async function getGlobalTotalCovidStats() {
  const covidData = await fetchGlobalCovidData();
  appState.globalCovid.totalConfirmedCases = covidData.data[0].confirmed;
  appState.globalCovid.totalActiveCases = covidData.data[0].active;
  appState.globalCovid.totalRecovered = covidData.data[0].recovered;
  appState.globalCovid.totalDeaths = covidData.data[0].deaths;
}


// fill the each country in the array with covid data
function fillCountriesCovidData(country, covidData) {
  country.totalConfirmed = covidData.data.latest_data.confirmed;
  country.totalRecovered = covidData.data.latest_data.recovered;
  country.totalDeaths = covidData.data.latest_data.deaths;
  country.currentActive = covidData.data.latest_data.critical;
  country.today = covidData.data.today; //newConfirmed; newDeaths;
  country.population = covidData.data.population
}

// sum total continent covid stats
function fillContinentCovidData(country, continent, covidData) {
  world[continent].totalConfirmedCases += covidData.data.latest_data.confirmed;
  world[continent].totalActiveCases += covidData.data.latest_data.critical;
  world[continent].totalRecovered += covidData.data.latest_data.recovered;
  world[continent].totalDeaths += covidData.data.latest_data.deaths;
}

// maintain at appState a list of all country names not sorted by continents
// the countries are sorted alphabetically from the api 
async function initAllCountriesList() {
  const globalCountries = await fetchCountriesByRegion('global');
  globalCountries.forEach(country => {
    if(country.region !== "") {
      const countryObj = {
        name: country.name.common,
        region: country.region,
      }
      appState.globalCovid.countriesArray.push(countryObj);
    }
  });
}


// TODO
async function init() {
  await initWorld(Object.keys(world));
  await initAllCountriesList();
  await getGlobalTotalCovidStats();
  renderRegionStatsSquares();
  renderSidebarRegions();
  renderSidebarCountries();  
}

init();

/* - - - - - - - - - - - render data - - - - - - - - - - - - */

function renderSidebarRegions() {
  const regions = ['global', ...Object.keys(world)];
  const regionContainer = document.querySelector('.region-list');
  regions.forEach(region => {
    const regionBtn = document.createElement('button');
    regionBtn.classList.add('regionBtn');
    regionBtn.textContent = region;
    regionBtn.setAttribute('name', region);
    regionContainer.appendChild(regionBtn);
    regionBtn.addEventListener('click', handleRegionClick);
  });
}

function renderSidebarCountries() {
  clearSidebarCountryList();
  let continent = appState.currentRegion;
  continent === 'global' 
  ? renderSidebarCountryList(appState.globalCovid.countriesArray)
  : renderSidebarCountryList(world[continent].countriesArray);
}

function renderSidebarCountryList(countriesArray) {
  const listContainer = document.querySelector('.country-list');
  countriesArray.forEach(country => {
    if(country.name.length < 26) {
      const countryBtn = document.createElement('button');
      countryBtn.classList.add('countryBtn');
      countryBtn.setAttribute('name', country.name);
      countryBtn.textContent = country.name;
      listContainer.appendChild(countryBtn);
      countryBtn.addEventListener('click', handleCountryClick);
    }
    /* excluded those countries just for convenience: 
      British Indian Ocean Territory
      Saint Helena, Ascension and Tristan da Cunha
      Saint Vincent and the Grenadines
      United States Minor Outlying Islands
      United States Virgin Islands
    */
  });
} 

function clearSidebarCountryList() {
  const countryBtns = document.querySelectorAll('.countryBtn');
  countryBtns.forEach(btn => btn.remove());
}


function renderRegionStatsSquares() {
  let regionName = document.querySelector('.region-name');
  let totalCasesDisplay = document.querySelector('.total-cases-number');
  let totalActiveDisplay = document.querySelector('.total-active-number');
  let totalRecoveredDisplay = document.querySelector('.total-recovered-number');
  let totalDeathsDisplay = document.querySelector('.total-deaths-number');

  if (appState.currentRegion === 'global') {
    regionName.textContent = "World:"
    totalCasesDisplay.textContent = numberWithCommas(appState.globalCovid.totalConfirmedCases);
    totalActiveDisplay.textContent = numberWithCommas(appState.globalCovid.totalActiveCases);
    totalRecoveredDisplay.textContent = numberWithCommas(appState.globalCovid.totalRecovered);
    totalDeathsDisplay.textContent = numberWithCommas(appState.globalCovid.totalDeaths);
  }

  else {
    regionName.textContent = capitalizeFirstLetter(appState.currentRegion) + ':';
    totalCasesDisplay.textContent = numberWithCommas(world[appState.currentRegion].totalConfirmedCases);
    totalActiveDisplay.textContent = numberWithCommas(world[appState.currentRegion].totalActiveCases);
    totalRecoveredDisplay.textContent = numberWithCommas(world[appState.currentRegion].totalRecovered);
    totalDeathsDisplay.textContent = numberWithCommas(world[appState.currentRegion].totalDeaths);
  }
}

function numberWithCommas(x) {
  return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function capitalizeFirstLetter(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function handleRegionClick(e) {
  console.log(e.target);
  appState.currentRegion = e.target.getAttribute('name');
  renderSidebarCountries();
  renderRegionStatsSquares();
}


function handleCountryClick(e) {
  
}


function calculateStatsPerCountry(country) {
  
}

function calculateStatsPerContinent(country) {
  
}

function calculateStatsPerWorld(country) {
  
}



// - - - - - - - - - - - - - - - Chart - - - - - - - - - - - - - - - //

const ctx = document.querySelector('#myChart').getContext('2d');
const chart = new Chart(ctx, {
    // The type of chart we want to create
    type: 'line',

    // The data for our dataset
    data: {
        labels: ['January', 'February', 'March', 'April', 'May', 'June', 'July'],
        datasets: [
          {
            label: '# of Votes',
            data: [12, 19, 3, 5, 2, 3, 10],
            backgroundColor: [
                'rgba(255, 99, 132, 0.4)',
                'rgba(54, 162, 235, 0.2)',
                'rgba(255, 206, 86, 0.2)',
                'rgba(75, 192, 192, 0.2)',
                'rgba(153, 102, 255, 0.2)',
                'rgba(255, 159, 64, 0.2)',
            ],
            borderColor: [
                'rgba(255, 99, 132, 1)',
                'rgba(54, 162, 235, 1)',
                'rgba(255, 206, 86, 1)',
                'rgba(75, 192, 192, 1)',
                'rgba(153, 102, 255, 1)',
                'rgba(255, 159, 64, 1)',
            ],
            borderWidth: 1
          },
          {
            label: '# of Cases',
            data: [14, 9, 13, 5, 12, 4, 2],
            backgroundColor: [
                // 'rgba(255, 99, 132, 0.2)',
                'rgba(54, 162, 235, 0.4)',
                'rgba(255, 206, 86, 0.2)',
                'rgba(75, 192, 192, 0.2)',
                'rgba(153, 102, 255, 0.2)',
                'rgba(255, 159, 64, 0.2)',
            ],
            borderColor: [
                // 'rgba(255, 99, 132, 1)',
                'rgba(54, 162, 235, 1)',
                'rgba(255, 206, 86, 1)',
                'rgba(75, 192, 192, 1)',
                'rgba(153, 102, 255, 1)',
                'rgba(255, 159, 64, 1)',
            ],
            borderWidth: 1
          }
        ],
    },

    // Configuration options go here
    options: {
      scales: {
        yAxes: [{
            ticks: {
                beginAtZero: true,
            }
        }]
      },
      responsive: true,
      // legend: {
      //   display: true,
      //   labels: {
      //       fontColor: 'rgb(205, 99, 132)'
      //   }
      // }
    }
});

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - //
