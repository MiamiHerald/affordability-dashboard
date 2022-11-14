function onOpen() {
  SpreadsheetApp.getUi() // Or DocumentApp or SlidesApp or FormApp.
    .createMenu('How to use this spreadsheet')
    .addItem('Show sidebar', 'showSidebar')
    .addToUi();
    showSidebar();
}

function showSidebar() {
  var html = HtmlService.createHtmlOutputFromFile('sidebar')
    .setTitle('How to use this spreadsheet');
  SpreadsheetApp.getUi() // Or DocumentApp or SlidesApp or FormApp.
    .showSidebar(html);
}