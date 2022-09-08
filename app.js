import fetch from 'node-fetch';
import fs, {
    writeFile
} from 'fs';
import Papa from 'papaparse';

/* 
LOCATIONS TO CREATE FILES AND UPDATE CHARTS

{
    myCounty: "county name exactly as it appears in original data"
    fileID: "shorthand identifier for this location"
    "chart-type": "datawrapper ID for respective chart"
}

*/

let locations = [{
        countyID: "miami-dade, fl",
        fileID: "miami",
        "median-price-change": "VhEJI",
        "raw-inventory-count": "FdUo5",
        "six-months-median-cost": "xQlp5",
        "six-months-median-county-only": "wa3TI"
    },
    {
        countyID: "fayette, ky",
        fileID: "lex",
        "median-price-change": "S2Zqn",
        "raw-inventory-count": "BjaZl",
        "six-months-median-cost": "YI33L",
        "six-months-median-county-only": "04HS6"
    }
];

/* DATA LINKS */
let countiesHistoric = "https://econdata.s3-us-west-2.amazonaws.com/Reports/Core/RDC_Inventory_Core_Metrics_County_History.csv";
let nationalHistoric = "https://econdata.s3-us-west-2.amazonaws.com/Reports/Core/RDC_Inventory_Core_Metrics_Country_History.csv";

fetchData(countiesHistoric, nationalHistoric);


/* SCRAPE DATA FROM LINKS, THEN SEND TO PARSERESULTS */
function fetchData(countiesHistoric, nationalHistoric) {
    Promise.all([
        fetch(countiesHistoric).then(resp => resp.text()),
        fetch(nationalHistoric).then(resp => resp.text())
    ]).then(stringsArr => {
        // stringsArr is an array with length of 2. stringsArr[0] is counties; stringsArr[1] is national
        parseResults(stringsArr);
    });
}; // END FETCHDATA FUNCTION

/* PARSE RESULTS, GET PROCESSED DATA, THEN SEND TO FILESANDCHARTS FUNCTION */
function parseResults(stringsArr) {

    let parsedArr = []; // to push parsed string of each URL into

    // parse each string in stringsArr
    stringsArr.forEach(string => {
        Papa.parse(string, {
            worker: true,
            header: true,
            error: (error) => console.log(error),
            skipEmptyLines: true,
            complete: (parsed) => {
                // push results into array. when done, send allParsed to getLocation()
                parsedArr.push(parsed.data);
                if (parsedArr.length == stringsArr.length) {
                    let counties = parsedArr[0];
                    let nat = parsedArr[1];

                    // process national data first so it can be merged with each county loop
                    const natObj = nationalData(nat);

                    // loop locations object
                    for (let loc in locations) {
                        let location = locations[loc];

                        // array of current loop location county data
                        const countyObj = processCounties(counties, location, natObj)

                        // send this county's data to filesAndCharts function
                        filesAndCharts(countyObj, location);
                    } // END LOCATIONS LOOP
                }
            }
        })
    });
}; // END PARSERESULTS FUNCTION

/* WRITE NEW CSV FILE; UPDATE LIVE CHART DATA; UPDATE METADATA; PUBLISH CHART. */
function filesAndCharts(countyObj, location) {

    // create new subfolder in 'csvs/' if one does not already exist for location
    if (!fs.existsSync(location.fileID)) {
        fs.mkdir(`csvs/${location.fileID}`, (err) => {
            if (err) return err;
        })
    }

    // loop each key within this location object to get chart types
    for (let key in location) {
        if (key != 'countyID' && key != 'fileID') {

            // get data formatted for this chart type
            const chartData = eachChart(countyObj, location, key);

            // unparse data
            let unparsed = Papa.unparse(chartData, {
                header: true
            });

            // write csv
            fs.writeFile(`csvs/${location.fileID}/${location.fileID}-${key}.csv`, unparsed, (err) => {
                if (err) {
                    console.log(err)
                } else {
                    console.log(`csvs/${location.fileID}/${location.fileID}-${key}.csv written successfully`)
                }
            });

            // update datawrapper ID associated with this chart
            let chartID = location[key];
            updateCharts(unparsed, chartID); // switch back to unparsed

        } // END KEY FILTER
    } // END KEY LOOP
}; // END FILESANDCHARTS FUNCTION



////////*  hoisted functions  *////////

/* PROCESS NATIONAL DATA. RETURN TO PARSERESULTS */
function nationalData(nat) {
    let natJan18MedianPrice;

    let natObj = [];

    for (let row in nat) {

        let national = nat[row];

        let nationalRow = {};

        // get january 2018 value
        if (Number(national.month_date_yyyymm) == 201801) {
            natJan18MedianPrice = national.median_listing_price;
        }

        if (Number(national.month_date_yyyymm) >= 201801) {
            nationalRow = {
                month_date_yyyymm: national.month_date_yyyymm,
                // county: 'U.S. Overall',
                US_median_listing_price: national.median_listing_price,
                US_active_listing_count: national.active_listing_count,
                US_median_days_on_market: national.median_days_on_market,
                US_new_listing_count: national.new_listing_count,
                US_price_increased_count: national.price_increased_count,
                US_price_reduced_count: national.price_reduced_count,
                US_pending_listing_count: national.pending_listing_count,
                US_median_listing_price_per_square_foot: national.median_listing_price_per_square_foot,
                US_median_square_feet: national.median_square_feet,
                US_average_listing_price: national.average_listing_price,
                US_total_listing_count: national.total_listing_count,
                US_pending_ratio: national.pending_ratio,
                US_quality_flag: national.quality_flag,
            }
            natObj.push(nationalRow)
        }
        //console.log(natObj);

    } // end national data loop

    natObj.forEach(obj => {
        obj.US_jan_median = natJan18MedianPrice;
    });
    return natObj;
} // END NATIONALDATA FUNCTION

/* FILTER DATA FOR APPROPRIATE COUNTY AND TIME FRAME. COMBINE WITH NATIONAL DATA BY DATE. RETURN TO PARSERESULTS */
function processCounties(counties, location, natObj) {

    let countyJan18MedianPrice;
    let countyObj = [];

    for (let row in counties) {
        let county = counties[row];
        let countyRow = {};

        // get january 2018 value
        if (Number(county.month_date_yyyymm) == 201801 && county.county_name == location.countyID) {
            countyJan18MedianPrice = county.median_listing_price;
        }

        if (Number(county.month_date_yyyymm) >= 201801 && county.county_name == location.countyID) {
            countyRow = {
                county: county.county_name.slice(0, -4) + " county",
                date: `${county.month_date_yyyymm.slice(-2)}-${county.month_date_yyyymm.slice(0,4)}`,
                month_date_yyyymm: county.month_date_yyyymm,
                county_median_listing_price: county.median_listing_price,
                county_active_listing_count: county.active_listing_count,
                county_median_days_on_market: county.median_days_on_market,
                county_new_listing_count: county.new_listing_count,
                county_price_increased_count: county.price_increased_count,
                county_price_reduced_count: county.price_reduced_count,
                county_pending_listing_count: county.pending_listing_count,
                county_median_listing_price_per_square_foot: county.median_listing_price_per_square_foot,
                county_median_square_feet: county.median_square_feet,
                county_average_listing_price: county.average_listing_price,
                county_total_listing_count: county.total_listing_count,
                county_pending_ratio: county.pending_ratio,
                county_quality_flag: county.quality_flag,
            }
            // console.log(countyRow);

            // create empty object to merge national and county data for this row loop's month into
            let combinedObj = {};
            // loop national obj to find matching date row
            for (let each in natObj) {
                if (natObj[each].month_date_yyyymm == countyRow.month_date_yyyymm) {
                    // combine national and county data with same month
                    combinedObj = {
                        ...countyRow,
                        ...natObj[each]
                    }
                }
            }
            countyObj.push(combinedObj);
        } // end  county and year filter
    } // end counties data loop

    countyObj.forEach(obj => {
        obj.county_jan18_median = countyJan18MedianPrice;
    });

    return countyObj;

} // END PROCESSCOUNTIES FUNCTION

/* FORMAT DATA ACCORDING TO CHART TYPE & RETURN TO filesAndCharts */
function eachChart(countyObj, location, key) {

    /* FORMAT COUNTY AND STATE NAMES */
    let county = (location.countyID.slice(0, -2).split(' ').map((x) => x.charAt(0).toUpperCase() + x.substring(1)).join(' ').slice(0, -2)).split('-').map((x) => x.charAt(0).toUpperCase() + x.substring(1)).join('-') + " County";
    let state = location.countyID.slice(-2).toUpperCase();

    /* DECLARE KEY NAMES THAT USE COUNTY NAME */
    let medianIncreaseKey = `${county} Percent Change Since January 2018`;
    let rawMedianKey = `${county} Median Home Cost`;

    // empty arr to push each chart's data into
    let formattedArr = [];
    let count = 0;

    // "County": countyObj[each].county,

    for (let each in countyObj) {
        let newObj = {};
        if (key == 'median-price-change') {
            newObj = {
                "Date": countyObj[each].date,
                "U.S. Overall Percent Change Since January 2018": (((countyObj[each].US_median_listing_price - countyObj[each].US_jan_median) / countyObj[each].US_jan_median) * 100).toFixed(2),
                [medianIncreaseKey]: (((countyObj[each].county_median_listing_price - countyObj[each].county_jan18_median) / countyObj[each].county_jan18_median) * 100).toFixed(2),
            }

        } else if (key == 'raw-inventory-count') {
            newObj = {
                "Date": countyObj[each].date,
                "Number of Homes on Market": countyObj[each].county_total_listing_count
            }
        } else if (key == 'six-months-median-cost') {
            // get only most recent six months
            count += 1;
            if (count <= 6) {
                newObj = {
                    "Date": countyObj[each].date,
                    [rawMedianKey]: countyObj[each].county_median_listing_price,
                }
            }
        } else if (key == 'six-months-median-county-only') {
            count += 1;
            if (count <= 6) {
                newObj = {
                    "Date": countyObj[each].date,
                    [rawMedianKey]: countyObj[each].county_median_listing_price,
                    'U.S. Overall Median Home Cost': countyObj[each].US_median_listing_price
                }
            }
        }
        if (Object.keys(newObj).length != 0) {
            formattedArr.push(newObj)
        }
    }
    return formattedArr; // now can access as chartData in writeFiles

} // END EACHCHART FUNCTION

/* MAKE HTTP REQUESTS TO UPDATE CHART */
async function updateCharts(data, chartID) {

    // your datawrapper API key goes here
    const DW_TOKEN = process.env.DW_TOKEN;

    /*
    'PATCH' FOR UPDATING METADATA/CHART TEXT
    'POST' FOR REFRESHING LIVE DATA & PUBLISHING
    */

    const postOptions = {
        method: "POST",
        headers: {
            Accept: "*/*",
            Authorization: `Bearer ${DW_TOKEN}`
        }
    }

    const patchOptions = {
        method: 'PATCH',
        headers: {
            Authorization: `Bearer ${DW_TOKEN}`,
            Accept: '*/*',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            metadata: {
                describe: {
                    byline: 'Court Cox',
                    intro: 'intro text here'
                },
                annotate: {
                    notes: `Last update: ${new Date().toLocaleString()}`
                },
            }
        })
    }

    // use fetch calls to run each process of updating chart
    // data/refresh will refresh external data link
    await fetch(`https://api.datawrapper.de/v3/charts/${chartID}/data/refresh`, postOptions)
    .then(response => response.json())
    .then(res => console.log('POST Success'))
    .catch(err => console.log('publish error'));

    await fetch(`https://api.datawrapper.de/v3/charts/${chartID}`, patchOptions)
        .then(response => response.json())
        .then(res => console.log('PATCH success', res))
        .catch(err => console.error('patch error'));

    await fetch(`https://api.datawrapper.de/v3/charts/${chartID}/publish`, postOptions)
        .then(response => response.json())
        .then(res => console.log('POST Success'))
        .catch(err => console.log('publish error'));
} // END UPDATECHARTS FUNCTION










// put


    // await fetch(`https://api.datawrapper.de/v3/charts/${chartID}/data`, putOptions)
    //     .then(response => response.json())
    //     .then(res => console.log('PUT Success', res))
    //     .catch(err => console.log(err));

        // create object for each method to use in fetch request
    // const putOptions = {
    //     method: "PUT",
    //     headers: {
    //         "authorization": `Bearer ${DW_TOKEN}`,
    //         "content-type": "application/json; charset=utf-8",
    //         "cache-control": "no cache",
    //         "cf-cache-status": "DYNAMIC",
    //         "connection": "keep-alive",
    //         "access-control-allow-origin": "*",
    //         "access-control-allow-credentials": true
    //     },
    //     body: data
    // }