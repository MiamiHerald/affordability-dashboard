function updateCharts() {

  // datawrapper access token
  const dwToken = "YOUR_TOKEN_HERE";

  // get most recent month's data available
  let recentMonthSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("most-recent-month");
  const zillowMostRecentMonth = `${recentMonthSheet.getRange(1, 2).getValue()}`;
  const realtorMostRecentMonth = `${recentMonthSheet.getRange(2, 2).getValue()}`;

  // get names for specified locations for these charts
  let locationSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("this-spreadsheet");
  let countyCell = `"${locationSheet.getRange(2, 2).getValue()}"`; // getRange(row, col)
  let stateCell = `"${locationSheet.getRange(3, 2).getValue()}"`.toLowerCase();
  let metro = `"${locationSheet.getRange(5, 2).getValue()}"`;

  // chart IDs
  let dataWrapperIDs = {
    "info-table": "jcQ2y",
    "comparison-table": "jKuws",
    "county-inventory": "01gCe",
    "metro-rent-range-plot": "nxHaq",
    "zillow-home-value-since-2020": "HF3gQ"
  };

  // get alt text
  let infoTableAlt = `${SpreadsheetApp.getActiveSpreadsheet().getSheetByName("info-table-alt-text").getRange(1, 1).getValue()}`;


  /* LOOP THROUGH ALL DATAWRAPPER CHARTS TO UPDATE METADATA AND REFRESH DATA */

  for (let id in dataWrapperIDs) {
    let chartID = dataWrapperIDs[id];


    // DEFINE METADATA FOR EACH CHART
    let metadata = {};

    if (id == "info-table") {
      metadata = {
        annotate: {
          notes: `Sources: <a href='https://www.realtor.com/research/data/'>Realtor.com residential listings database</a> and <a href='https://www.zillow.com/research/data/'> Zillow (ZORI)</a>.<br>Last update: ${new Date().toLocaleString()}`,
          byline: 'Court Cox',
          "aria-description": infoTableAlt
        }
      }

    } else if (id == "comparison-table") {
      metadata = {
        annotate: {
          notes: `Sources: <a href='https://www.realtor.com/research/data/'>Realtor.com residential listings database</a> and <a href='https://www.zillow.com/research/data/'> Zillow (ZORI)</a>.<br>Last update: ${new Date().toLocaleString()}`,
          byline: 'Court Cox'
        },
      }

    } else if (id == "median-home-prices-over-time") {
      metadata = {
        annotate: {
          notes: `Last update: ${new Date().toLocaleString()}`,
          byline: 'Court Cox'
        },
      }

    } else if (id == "county-inventory") {
      metadata = {
        annotate: {
          notes: `Last update: ${new Date().toLocaleString()}`,
          byline: 'Court Cox'
        },
      }

    } else if (id == "price-since-2020") {
      metadata = {
        annotate: {
          notes: `Last update: ${new Date().toLocaleString()}`,
          byline: 'Court Cox'
        },
      }

    } else if (id == "metro-rent-range-plot") {
      metadata = {
        annotate: {
          notes: `Current year uses most recent month's data available for "end of year" value (${zillowMostRecentMonth}).<br>Last update: ${new Date().toLocaleString()}`,
          byline: 'Court Cox'
        },
      }

    } else if (id == "zillow-home-value-since-2020") {
      metadata = {
        annotate: {
          notes: `Last update: ${new Date().toLocaleString()}`,
          byline: 'Court Cox'
        },
      }
    }

    Logger.log(metadata);


    /* DECLARE OPTIONS FOR FETCH REQUESTS */


    // 'PATCH' FOR UPDATING CHART METADATA
    const patchOptions = {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${dwToken}`,
        Accept: '*/*',
        'Content-Type': 'application/json'
      },
      payload: JSON.stringify({
        metadata: metadata
      }),
      muteHTTPExceptions: true
    }


    // 'POST' FOR REFRESHING LIVE DATA & PUBLISHING
    const postOptions = {
      method: "POST",
      headers: {
        Accept: "*/*",
        Authorization: `Bearer ${dwToken}`
      },
      muteHTTPExceptions: true
    }


    // USE FETCH CALLS TO ACCESS DATAWRAPPER API TO UPDATE, REFRESH DATA, AND RE-PUBLISH

    let postResponse = UrlFetchApp.fetch(`https://api.datawrapper.de/v3/charts/${chartID}/data/refresh`, postOptions);
    //Logger.log(postResponse.getContentText());

    let patchResponse = UrlFetchApp.fetch(`https://api.datawrapper.de/v3/charts/${chartID}`, patchOptions);
   // Logger.log(patchResponse.getContentText());

    let publishPostResponse = UrlFetchApp.fetch(`https://api.datawrapper.de/v3/charts/${chartID}/publish`, postOptions);
  //  Logger.log(publishPostResponse.getContentText());


  }

}

