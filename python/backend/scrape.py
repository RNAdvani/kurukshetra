from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
import time
import csv

# Initialize WebDriver (Ensure chromedriver is installed)
driver = webdriver.Chrome()

# Open the MEA website
driver.get("https://www.mea.gov.in/Speeches-Statements.htm?50/Speeches__amp;_Statements")

# Wait for the page to load
time.sleep(3)

# Find the search bar and input "S. Jaishankar"
search_box = driver.find_element(By.XPATH, '//*[@id="ContentPlaceHolder1_UserPublications1_txtKeyword"]')
search_box.send_keys("S. Jaishankar")
search_box.send_keys(Keys.RETURN)

# Wait for results to load
time.sleep(5)

# Get all speech links
articles = driver.find_elements(By.CSS_SELECTOR, "a[href*='Speeches-Statements.htm']")

# List to store scraped data
speech_data = []

# Loop through each article link
for article in articles:
    try:
        # Get article link
        article_link = article.get_attribute("href")
        
        # Open in new tab
        driver.execute_script(f"window.open('{article_link}', '_blank');")
        driver.switch_to.window(driver.window_handles[1])

        time.sleep(3)  # Wait for page to load
        
        # Extract title
        title = driver.find_element(By.TAG_NAME, "h1").text.strip()

        # Extract date using the corrected XPath
        date_element = driver.find_elements(By.XPATH, '//*[@id="ContentPlaceHolder1_UserPublications1_lblDate"]')
        date = date_element[0].text.strip() if date_element else "Date not found"

        # Extract speech content using the given XPath
        speech_content = driver.find_element(By.XPATH, '//*[@id="ContentPlaceHolder1_UserPublications1_ltrlDesc"]/p').text.strip()

        # Store data
        speech_data.append([title, date, speech_content])

        print(f"✅ Scraped: {title} ({date})")

        # Close tab and switch back
        driver.close()
        driver.switch_to.window(driver.window_handles[0])
    except Exception as e:
        print(f"❌ Error scraping: {e}")
        driver.close()
        driver.switch_to.window(driver.window_handles[0])

# Close the browser
driver.quit()

# Save results to CSV
with open("speeches.csv", "w", newline="", encoding="utf-8") as file:
    writer = csv.writer(file)
    writer.writerow(["Title", "Date", "Speech"])
    writer.writerows(speech_data)

print("\n✅ Data saved to speeches.csv")
