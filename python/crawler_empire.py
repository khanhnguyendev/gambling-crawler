import schedule
import time
from datetime import datetime
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

def crawl_and_save():
    url = 'https://csgoempire.com/'
    options = Options()
    options.add_argument('--headless')
    driver = webdriver.Chrome(options=options)  # Replace with the path to your webdriver
    driver.get(url)

    try:    
        element_present = EC.presence_of_element_located((By.CLASS_NAME, 'previous-rolls-enter-active'))
        WebDriverWait(driver, 10).until(element_present)

        while True:
            try:
                # Wait for the div to load and get the class name
                element_present = EC.presence_of_element_located((By.CLASS_NAME, 'previous-rolls-enter-active'))
                WebDriverWait(driver, 10).until(element_present)
                
                # Get the latest roll data
                items = driver.find_elements(By.XPATH,"//div[contains(@class, 'previous-rolls-item')]")
                now = datetime.now().strftime('%Y-%m-%d_%H-%M-%S')
                with open('output.txt', 'a') as f:
                    # f.write(now + '\n')
                    if len(items) > 0:
                        latest_item = items[-1]
                        ct_elements = latest_item.find_elements(By.CLASS_NAME, 'coin-ct')
                        t_elements = latest_item.find_elements(By.CLASS_NAME, 'coin-t')
                        bonus_elements = latest_item.find_elements(By.CLASS_NAME, 'coin-bonus')
                        if ct_elements:
                            f.write('CT')
                        elif t_elements:
                            f.write('T')
                        elif bonus_elements:
                            f.write('Bonus')
                        else:
                            f.write('Missing')
                        f.write(latest_item.text + '\n')
                        
                # Wait for the class name to disappear
                element_present = EC.presence_of_element_located((By.CLASS_NAME, 'previous-rolls-enter-active'))
                WebDriverWait(driver, 10).until_not(element_present)
                
            except Exception as e:
                print('Error:', e)
        
    except Exception as e:
        print('Error:', e)

    finally:
        driver.quit()


# schedule.every(3).seconds.do(crawl_and_save)

# while True:
#     schedule.run_pending()
#     time.sleep(1)