function scrapeAndFilter() {

  /* GET SPECIFIED LOCATIONS FROM "this-spreadsheet" TO DETERMINE HOW TO FILTER DATA */
  let locationSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("this-spreadsheet");
  let countyCell = `"${locationSheet.getRange(2, 2).getValue()}"`; // getRange(row, col)
  let stateCell = `"${locationSheet.getRange(3, 2).getValue()}"`.toLowerCase();
  let metro = `"${locationSheet.getRange(5, 2).getValue()}"`;


  /* CREATE OBJECT DECLARING URLS TO SCRAPE FROM + WHICH SHEET TO WRITE RESULTS TO */

  let sources = {
    county: {
      url: "https://econdata.s3-us-west-2.amazonaws.com/Reports/Core/RDC_Inventory_Core_Metrics_County_History.csv",
      sheetName: ["county"],
      include: countyCell
    },
    national: {
      url: "https://econdata.s3-us-west-2.amazonaws.com/Reports/Core/RDC_Inventory_Core_Metrics_Country_History.csv",
      sheetName: ["national"],
      include: "United States"
    },
    state: {
      url: "https://econdata.s3-us-west-2.amazonaws.com/Reports/Core/RDC_Inventory_Core_Metrics_State_History.csv",
      sheetName: ["state"],
      include: stateCell
    },
    allStatesThisMonth: {
      url: "https://econdata.s3-us-west-2.amazonaws.com/Reports/Core/RDC_Inventory_Core_Metrics_State.csv",
      sheetName: ["this-month-all-states"],
      include: ""
    },
    metroRent: {
      url: "https://files.zillowstatic.com/research/public_csvs/zori/Metro_zori_sm_sa_month.csv?t=1663952631", // smoothed, seasonally adjusted
      sheetName: ["this-area-rent", "all-metros-rent"],
      include: metro
    },
    nationalRent: {
      url: "https://files.zillowstatic.com/research/public_csvs/zori/Metro_zori_sm_sa_month.csv", // link can also be used for metro rent
      sheetName: ["national-rent"],
      include: "United States"
    },
    zillowHomeValue: {
      url: "https://files.zillowstatic.com/research/public_csvs/zhvi/Metro_zhvi_uc_sfrcondo_tier_0.33_0.67_sm_sa_month.csv",
      sheetName: ["zillow-home-value"],
      include: metro,
      includeAlso: "United States"
    }
  };

  /* LOOP THROUGH EACH PROPERTY OF SOURCES OBJECT TO SCRAPE EACH URL + WRITE RESULTS */

  for (let prop in sources) {
    let each = sources[prop];
    each.sheetName.forEach(sheetId => {

      let response = UrlFetchApp.fetch(each.url);

      let dataString = response.getContentText();

      let csvArr = Utilities.parseCsv(dataString);

      /* 
      note that apps script seems to have a Logger error which makes "miami-dade, fl" appear as two separate array elements in the county csvArr. 
      it can be accessed as one item [innerArrNumber][2]; the Logger just doesn't show the quotes.
      */

      let data = [];

      // don't filter the sheet where we want to keep all states
      if (sheetId == "this-month-all-states" || sheetId == "all-metros-rent") {

        // remove last row due to unformatted row in original data source
        csvArr.pop();
        data = csvArr;

        // filter all other sheets to only include locations found in locationFilter
      } else {

        // get header row
        let headerRow = csvArr.slice(0, 1)[0];

        /* TODO: fix checkHeaders function to return an error if that header have changed */
        // let headerCheck = JSON.stringify(headerRow);
        // checkHeaders(headerCheck);

        let locationFilter = each.include.replace(/['"]+/g, '');


        // filter to include only the specified location
        data = csvArr.slice(1).filter(innerArr => innerArr.includes(locationFilter));

        // zillow-home-value sheet filters both the metro and United States from one sheet. get U.S. row:
        if ("includeAlso" in each) {
          let filterAlso = each.includeAlso.replace(/['"]+/g, '');
          moreData = csvArr.slice(1).filter(innerArr => innerArr.includes(filterAlso));
          data.push(moreData[0]);
        }

        // add header row back to results
        data.unshift(headerRow)

      };

      // send each array of data to writeCsv to write to sheet 
      writeCsv(data, sheetId)

    }) // end sheetName loop

  } // END SOURCES LOOP

} // END SCRAPEANDFILTER




/* WRITE DATA TO SHEET + WRITE A COPY */
function writeCsv(data, sheetId) {

  // get the sheet name associated with the url this data was scraped from
  let sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetId);
  // write a duplicate copy of this to a sheet by the same name + "-copy"
  let sheetCopy = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetId + "-copy");

  // find row and column counts
  let dimensions = {
    rowCount: Math.floor(data.length),
    colCount: Math.floor(data[0].length)
  }

  // declare range on sheet from A1 to however many rows and columns are present in the data array
  let range = sheet.getRange(1, 1, dimensions.rowCount, dimensions.colCount);
  // same as above but associated with the "-copy" sheet
  let rangeCopy = sheetCopy.getRange(1, 1, dimensions.rowCount, dimensions.colCount);

  // write the data to the range
  range.setValues(data);

  Logger.log(sheetId + " set");

  rangeCopy.setValues(data);

  Logger.log(sheetId + "-copy set");

} // END WRITECSV




