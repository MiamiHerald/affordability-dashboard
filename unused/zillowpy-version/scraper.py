'''
Script to gather Zillow data
'''

from bs4 import BeautifulSoup
import requests
import pandas as pd
from datetime import datetime
import csv

# ignore copy warning
pd.options.mode.chained_assignment = None  # default='warn'

def getTimestamp(url):
    # get the contents of the page using requests
    page = requests.get("https://files.zillowstatic.com/")
    # create BS object 
    soup = BeautifulSoup(page.text, features="xml")

    # filter the url to match the key format
    key = url.replace('https://files.zillowstatic.com/', '')
    #create a list of <Contents> tags
    contents = soup.find_all('Contents')
    # find the matching key in the list of tags
    for x in contents:
        if key == x.find('Key').get_text():
            timestamp = x.find('Key').next_sibling.get_text() 

    # convert timestamp string to datetime obj
    timestamp = datetime.strptime(timestamp, "%Y-%m-%dT%H:%M:%S.000Z") 

    #print("Data last updated: " + timestamp.strftime("%m-%d-%Y"))

    return timestamp.strftime("%m-%d-%Y %H:%M:%S")

# function that wrote the timestamps into the csvs
# def writeTimestamp(csv_name, url):
#     #create csv file
#     file = open(csv_name, 'a')
#     # make a Python CSV writer object
#     csvwriter = csv.writer(file)

#     # grab the timestamp
#     timestamp = getTimestamp(url)

#     # write the column headings row 
#     csvwriter.writerow([timestamp])

def clean_df(df):
    # filter for Miami and US
    df = df.loc[(df['RegionName'] == 'Miami-Fort Lauderdale, FL') | (df['RegionName'] == 'United States')]

    # transpose data so each row is a month
    df = df.transpose()

    # drop the first row (was the prev index)
    df.reset_index(inplace=True)
    df.columns = df.iloc[0]
    df.reset_index()
    df = df[1:]
    
    # rename 
    df.rename(columns={"RegionName": "Month"}, inplace=True)
    
    # convert month to datetime obj 
    df['Month'] =  pd.to_datetime(df['Month'], format='%Y-%m', exact=True)
    #filter for 2020 and up
    df = df[(df['Month'] > '2019-11-30')]
    
    return df


'''
RENT PRICES
'''

# declare the URL for the dataset
rent_url = "https://files.zillowstatic.com/research/public_csvs/zori/Metro_ZORI_AllHomesPlusMultifamily_Smoothed.csv"

#read the csv
rentals = pd.read_csv(rent_url)

# drop unnecessary columns
rentals = rentals.drop(['RegionID', 'SizeRank'], axis=1)

# clean the dataframe using function
rentals = clean_df(rentals)

#rename
rentals.rename(columns={'Miami-Fort Lauderdale, FL': 'South Florida Typical Rent Price'}, inplace=True)
rentals.rename(columns={'United States': 'U.S. Typical Rent Price'}, inplace=True)

# calculate percentage change for soflo
rentals['Percent Change in South Florida Typical Rent Price'] = rentals['South Florida Typical Rent Price'].pct_change()
# convert to percent
rentals['Percent Change in South Florida Typical Rent Price'] = rentals['Percent Change in South Florida Typical Rent Price'] * 100

# calculate percentage change for US
rentals['Percent Change in U.S. Typical Rent Price'] = rentals['U.S. Typical Rent Price'].pct_change()
# convert to percent
rentals['Percent Change in U.S. Typical Rent Price'] = rentals['Percent Change in U.S. Typical Rent Price'] * 100

# delete first row becase it has no pct change
rentals = rentals.iloc[1:]

# declare the CSV name
rent_csv = "rentals.csv"

# export to csv
rentals.to_csv(rent_csv, index=False)

# add the timstamp to csv
# writeTimestamp(housing_csv, sfr_url)


'''
HOUSING PRICES

FYI: SFR = Single Family Residence

'''

# declare the URLs for each dataset
sfr_url = "https://files.zillowstatic.com/research/public_csvs/zhvi/Metro_zhvi_uc_sfrcondo_tier_0.33_0.67_sm_sa_month.csv"

condo_url = "https://files.zillowstatic.com/research/public_csvs/zhvi/Metro_zhvi_uc_condo_tier_0.33_0.67_sm_sa_month.csv"

# read the csvs
single_fam = pd.read_csv(sfr_url)

condos = pd.read_csv(condo_url)

# drop unnecessary columns
single_fam = single_fam.drop(['RegionID', 'SizeRank', 'RegionType', 'StateName'], axis=1)

condos = condos.drop(['RegionID', 'SizeRank', 'RegionType', 'StateName'], axis=1)

# clean the dataframes using function
single_fam = clean_df(single_fam)

condos = clean_df(condos)

#rename
single_fam.rename(columns={'Miami-Fort Lauderdale, FL': 'South Florida Typical Single Family Home Value'}, inplace=True)
single_fam.rename(columns={'United States': 'U.S. Typical Single Family Home Value'}, inplace=True)
condos.rename(columns={'Miami-Fort Lauderdale, FL': 'South Florida Typical Condo Value'}, inplace=True)
condos.rename(columns={'United States': 'U.S. Typical Condo Value'}, inplace=True)

# sfr - calculate percentage change for soflo
single_fam['Percent Change of South Florida Typical Single Family Home Value'] = single_fam['South Florida Typical Single Family Home Value'].pct_change()
# convert to percent
single_fam['Percent Change of South Florida Typical Single Family Home Value'] = single_fam['Percent Change of South Florida Typical Single Family Home Value'] * 100
# sfr - calculate percentage change for US
single_fam['Percent Change of U.S. Typical Single Family Home Value'] = single_fam['U.S. Typical Single Family Home Value'].pct_change()
# convert to percent
single_fam['Percent Change of U.S. Typical Single Family Home Value'] = single_fam['Percent Change of U.S. Typical Single Family Home Value'] * 100

# condos - calculate percentage change for soflo
condos['Percent Change of South Florida Typical Condo Value'] = condos['South Florida Typical Condo Value'].pct_change()
# convert to percent
condos['Percent Change of South Florida Typical Condo Value'] = condos['Percent Change of South Florida Typical Condo Value'] * 100
# condos - calculate percentage change for US
condos['Percent Change of U.S. Typical Condo Value'] = condos['U.S. Typical Condo Value'].pct_change()
# convert to percent
condos['Percent Change of U.S. Typical Condo Value'] = condos['Percent Change of U.S. Typical Condo Value'] * 100

# delete first row becase it has no pct change
single_fam = single_fam.iloc[1:]

condos = condos.iloc[1:]

# merge the dfs 
housing = single_fam.merge(condos, how='outer', on='Month')
#housing = single_fam.append(condos).reset_index(drop=True)

# declare the CSV name
housing_csv = "housing.csv"

# export to csv
housing.to_csv(housing_csv, index=False)

# add the timstamp to csv
# writeTimestamp(housing_csv, sfr_url)


'''
INVENTORY
'''

# declare the URL for the dataset
stock_url = "https://files.zillowstatic.com/research/public_csvs/invt_fs/Metro_invt_fs_uc_sfrcondo_sm_month.csv"

# read the csv
stock = pd.read_csv(stock_url)

# drop unnecessary columns
stock = stock.drop(['RegionID', 'SizeRank', 'RegionType', 'StateName'], axis=1)

# clean the dataframes using function
stock = clean_df(stock)

stock.rename(columns={"Miami-Fort Lauderdale, FL": "Homes on the market"}, inplace=True)
stock.rename(columns={"United States": "U.S. Homes on the market"}, inplace=True)

# # calculate percentage change for soflo
# stock['Change in homes on the market'] = stock['South Florida'].pct_change()
# # convert to percent
# stock['Change in homes on the market'] = stock['Change in homes on the market'] * 100

# delete first row becase it has no pct change
stock = stock.iloc[1:]

# declare the CSV name
stock_csv = "housing_inventory.csv"

# export to csv
stock.to_csv(stock_csv, index=False)

# add the timstamp to csv
# writeTimestamp(stock_csv, stock_url)


'''
GET TIMESTAMPS
'''

# save timestamps into variables

rent_time = getTimestamp(rent_url)
sfr_time = getTimestamp(sfr_url)
condo_time = getTimestamp(condo_url)
stock_time = getTimestamp(stock_url)

# make lists for the rows of the table
rent_list = ['Rent Prices: ', rent_time]
sfr_list = ['Single Family Home Value: ', sfr_time]
condo_list = ['Condo Value: ', condo_time]
stock_list = ['Home Inventory: ', stock_time]

# add the headers and the rows to a giant master list 
master = []
master.append(['Dataset', 'Time of Last Update'])
master.append(rent_list)
master.append(sfr_list)
master.append(condo_list)
master.append(stock_list)

# iterate through the master list and add rows to csv
# open csv
file = open('timestamps.csv', 'w')
# make a Python CSV writer object
csvwriter = csv.writer(file)

for x in master:
    csvwriter.writerow(x)

# close the file - end of function 
file.close()

