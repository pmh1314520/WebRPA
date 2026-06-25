export const practicalCasesContentEn = `# Practical Cases

This chapter provides complete solutions for common automation scenarios that you can reference or modify directly.

---

## Case 1: Automatic Login

### Scenario
Automatically log in to a website, useful for check-ins, logging in before data collection, and similar scenarios.

### Workflow Design

\`\`\`
1. Open page -> Login page URL
2. Wait for element -> Wait for the login form to load
3. Input text -> Username
4. Input text -> Password
5. Click element -> Login button
6. Wait for element -> Wait for the login success indicator
\`\`\`

### Detailed Configuration

**Step 1: Open page**
\`\`\`
URL: https://example.com/login
Wait condition: domcontentloaded
\`\`\`

**Step 2: Wait for element**
\`\`\`
Selector: #login-form
Wait condition: appear
Timeout: 10000
\`\`\`

**Step 3: Enter username**
\`\`\`
Selector: #username
Input content: {username}
Clear existing content: Yes
\`\`\`

**Step 4: Enter password**
\`\`\`
Selector: #password
Input content: {password}
Clear existing content: Yes
\`\`\`

**Step 5: Click login**
\`\`\`
Selector: #login-btn
Click type: single click
\`\`\`

**Step 6: Wait for login success**
\`\`\`
Selector: .user-avatar or .welcome-message
Wait condition: appear
Timeout: 15000
\`\`\`

### Handling CAPTCHA

If there is a CAPTCHA, you can:

**Option 1: AI vision recognition**
\`\`\`
1. Element screenshot -> CAPTCHA image
2. AI vision -> Recognize the CAPTCHA
3. Input text -> Enter the recognized result
\`\`\`

**Option 2: Manual input**
\`\`\`
1. User input -> Prompt "Please enter the CAPTCHA"
2. Input text -> Enter the CAPTCHA the user typed
\`\`\`

---

## Case 2: Product Data Collection

### Scenario
Collect product list data from an e-commerce website, including name, price, link, etc.

### Workflow Design

\`\`\`
1. Open page -> Product list page
2. Wait for element -> Wait for products to load
3. Get element info -> Get all product selectors
4. Iterate list -> Iterate over each product
   ├─ Get element info -> Product name -> Excel column: Name
   ├─ Get element info -> Product price -> Excel column: Price
   └─ Get element info -> Product link -> Excel column: Link
\`\`\`

### Detailed Configuration

**Step 1: Open page**
\`\`\`
URL: https://example.com/products?keyword={search keyword}
\`\`\`

**Step 2: Wait for products to load**
\`\`\`
Selector: .product-list .product-item
Wait condition: appear
\`\`\`

**Step 3: Get the product element list**
\`\`\`
Selector: .product-list .product-item
Extract type: element list
Save to variable: product element list
\`\`\`

**Step 4: Iterate and collect**
\`\`\`
Iterate list: product element list (enter the variable name directly, without braces)

Inner modules:
- Get element info
  Selector: {item} .product-title
  Extract type: text content
  Stored column name: Product name

- Get element info
  Selector: {item} .product-price
  Extract type: text content
  Stored column name: Price

- Get element info
  Selector: {item} a
  Extract type: attribute value
  Attribute name: href
  Stored column name: Link
\`\`\`

### Paginated Collection

\`\`\`
Set variable: current page = 1
Set variable: total pages = 10

Loop while ({current page} <= {total pages})
  ├─ Collect current page data (the iteration flow above)
  ├─ Condition check: is there a next page
  │   ├─ Yes -> Click the next page button
  │   │       Wait for the page to load
  │   │       Set variable: current page = {current page} + 1
  │   └─ No -> Break out of the loop
\`\`\`

---

## Case 3: News Article Collection

### Scenario
Collect the article list and detail content from a news website.

### Workflow Design

\`\`\`
1. Open page -> News list page
2. Get all article links
3. Iterate the link list
   ├─ Open the article page
   ├─ Get title -> Excel column: Title
   ├─ Get time -> Excel column: Publish time
   ├─ Get content -> Excel column: Body
   └─ Wait (to avoid requesting too fast)
\`\`\`

### Detailed Configuration

**Get the article link list**
\`\`\`
Selector: .news-list a.news-title
Extract type: attribute value
Attribute name: href
Save to variable: article link list
\`\`\`

**Iterate and collect details**
\`\`\`
Iterate list: article link list (enter the variable name directly)

- Open page: {item}
- Wait for element: .article-content appears

- Get element info
  Selector: h1.article-title
  Extract type: text content
  Stored column name: Title

- Get element info
  Selector: .publish-time
  Extract type: text content
  Stored column name: Publish time

- Get element info
  Selector: .article-content
  Extract type: text content
  Stored column name: Body

- Wait: 1000 ms (to avoid requesting too fast)
\`\`\`

---

## Case 4: Price Monitoring

### Scenario
Periodically check a product's price and send a notification when it drops.

### Workflow Design

\`\`\`
1. Set variable -> Target price
2. Open the product page
3. Get the current price
4. Condition check -> current price < target price
   ├─ Yes -> Send email notification
   └─ No -> Print log "Price unchanged"
\`\`\`

### Detailed Configuration

**Set the target price**
\`\`\`
Variable name: target price
Value: 100
Type: Number
\`\`\`

**Get the current price**
\`\`\`
Selector: .price-now
Extract type: text content
Save to variable: current price text

// You may need to handle the price format, e.g. remove the "¥" symbol
Run JavaScript:
  return parseFloat('{current price text}'.replace(/[¥,]/g, ''));
Save to variable: current price
\`\`\`

**Condition check**
\`\`\`
Left value: {current price}
Operator: <
Right value: {target price}
\`\`\`

**Send notification (when condition is true)**
\`\`\`
Recipient: your@email.com
Subject: [Price Drop Alert] The product price dropped!
Content:
The product you are watching has dropped in price!

Current price: {current price}
Target price: {target price}

Go grab it!
\`\`\`

---

## [√] Case 5: Automatic Check-in

### Scenario
Automatically log in to a website and complete the daily check-in task.

### Workflow Design

\`\`\`
1. Open page -> Website home page
2. Condition check -> already logged in
   ├─ No -> Run the login flow
   └─ Yes -> Continue
3. Open the check-in page
4. Condition check -> already checked in
   ├─ Yes -> Print "Already checked in today"
   └─ No -> Click the check-in button
5. Get the check-in result
6. Send notification (optional)
\`\`\`

### Check Login Status

\`\`\`
Run JavaScript:
  return document.querySelector('.user-avatar') !== null;
Save to variable: logged in

Condition check: {logged in} == true
\`\`\`

### Check Check-in Status

\`\`\`
Run JavaScript:
  const btn = document.querySelector('.sign-btn');
  return btn && btn.classList.contains('signed');
Save to variable: checked in

Condition check: {checked in} == true
\`\`\`

---

## Case 6: Batch Form Filling

### Scenario
Read data from Excel and batch-fill a web form.

### Workflow Design

\`\`\`
1. Read Excel -> Get the data list
2. Iterate the data list
   ├─ Open the form page
   ├─ Fill in name: {current item[Name]}
   ├─ Fill in phone: {current item[Phone]}
   ├─ Fill in email: {current item[Email]}
   ├─ Click submit
   ├─ Wait for submission to succeed
   └─ Print log: Submitted item {current index}
\`\`\`

### Read Excel Data

\`\`\`
Read Excel module
File path: C:/data/contacts.xlsx
Worksheet: Sheet1
Save to variable: data list

// Data format example:
// [{"Name": "Zhang San", "Phone": "13800138000", "Email": "zhangsan@example.com"}, ...]
\`\`\`

### Iterate and Fill

\`\`\`
Iterate list: data list (enter the variable name directly)

- Open page: https://example.com/form

- Input text
  Selector: #name
  Content: {item[Name]}

- Input text
  Selector: #phone
  Content: {item[Phone]}

- Input text
  Selector: #email
  Content: {item[Email]}

- Click element: #submit-btn

- Wait for element: .success-message appears

- Print log: Submitted item {index}: {item[Name]}

- Wait: 2000 ms
\`\`\`

---

## Case 7: Lazy-loading Page Collection

### Scenario
Collect from pages that require scrolling to load (such as Weibo, Zhihu).

### Workflow Design

\`\`\`
1. Open page
2. Set variable: collected count = 0
3. Set variable: target count = 100
4. Loop while ({collected count} < {target count})
   ├─ Get the currently visible data
   ├─ Update the collected count
   ├─ Scroll to the bottom of the page
   ├─ Wait for new content to load
   └─ Condition check: is there more
       └─ No -> Break out of the loop
\`\`\`

### Scroll-loading Logic

\`\`\`
Run JavaScript:
  // Get the number of currently loaded items
  return document.querySelectorAll('.feed-item').length;
Save to variable: current count

// Scroll to the bottom
Scroll page: to bottom

// Wait for new content to load
Wait: 2000 ms

// Check whether new content was loaded
Run JavaScript:
  return document.querySelectorAll('.feed-item').length;
Save to variable: new count

// Determine whether there is more
Condition check: {new count} > {current count}
  ├─ Yes -> Skip the current iteration
  └─ No -> Break out of the loop (reached the bottom)
\`\`\`

---

## Case 8: AI-assisted Data Processing

### Scenario
Collect comment data and use AI for sentiment analysis and classification.

### Workflow Design

\`\`\`
1. Collect the comment list
2. Iterate comments
   ├─ AI Brain -> Analyze sentiment
   ├─ Save the result to Excel
\`\`\`

### AI Analysis Configuration

\`\`\`
AI Brain module

System prompt:
You are a comment analysis expert. Analyze the sentiment tendency and main points of user comments.
Output in JSON format:
{
  "sentiment": "positive/negative/neutral",
  "score": sentiment score 0-100,
  "keywords": ["keyword1", "keyword2"],
  "summary": "one-sentence summary"
}
Only output JSON, nothing else.

User message:
Please analyze the following comment:
{current comment}

Save to variable: analysis result
\`\`\`

### Save the Analysis Result

\`\`\`
// Parse the JSON returned by the AI
Run JavaScript:
  try {
    return JSON.parse('{analysis result}');
  } catch(e) {
    return {sentiment: "unknown", score: 0, keywords: [], summary: ""};
  }
Save to variable: analysis data

// Save to Excel
Set variable (Excel column: Sentiment): {analysis data[sentiment]}
Set variable (Excel column: Score): {analysis data[score]}
Set variable (Excel column: Summary): {analysis data[summary]}
\`\`\`

---

## Case 9: Collect Data into a Database

### Scenario
Collect web page data and save it into a MySQL database.

### Workflow Design

\`\`\`
1. Connect to the database
2. Open page -> Product list page
3. Iterate the product list
   ├─ Get the product name
   ├─ Get the product price
   ├─ Get the product link
   └─ Insert the data into the database
4. Close the database connection
5. Print log: Collection complete
\`\`\`

### Detailed Configuration

**Step 1: Connect to the database**
\`\`\`
Host: localhost
Port: 3306
Username: root
Password: {database password}
Database name: web_rpa
Connection name: default
\`\`\`

**Steps 2-3: Collect and insert**
\`\`\`
Iterate list: product element list

- Get element info
  Selector: {item} .product-title
  Save to variable: product name

- Get element info
  Selector: {item} .product-price
  Save to variable: price

- Get element info
  Selector: {item} a
  Attribute: href
  Save to variable: link

- Insert data
  Table: products
  Data: {
    "name": "{product name}",
    "price": "{price}",
    "url": "{link}",
    "created_at": "{current time}"
  }
  Insert ID saved to: new ID

- Print log: Inserted product {product name}, ID: {new ID}
\`\`\`

**Step 4: Close the connection**
\`\`\`
Close database connection
Connection name: default
\`\`\`

### Database Table Structure

\`\`\`sql
CREATE TABLE products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  price DECIMAL(10,2),
  url VARCHAR(500),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
\`\`\`

---

## Case 10: Database Data Sync

### Scenario
Read pending data from a database, process it, then update the status.

### Workflow Design

\`\`\`
1. Connect to the database
2. Query the pending data
3. Iterate the data
   ├─ Run the processing logic (such as an API request)
   └─ Update the database status
4. Close the connection
\`\`\`

### Detailed Configuration

**Query pending data**
\`\`\`
Query data:
  SQL: SELECT * FROM tasks WHERE status = 0 LIMIT 100
  Save to variable: pending list
\`\`\`

**Iterate and process**
\`\`\`
Iterate list: pending list

- API request: process task
  URL: https://api.example.com/process
  Method: POST
  Body: {"task_id": "{item[id]}", "data": "{item[data]}"}
  Save to: processing result

- Condition check: {processing result[success]} == true
  ├─ Yes -> Update data
  │        Table: tasks
  │        Data: {"status": 1, "result": "{processing result[data]}"}
  │        WHERE: id = {item[id]}
  └─ No -> Update data
           Table: tasks
           Data: {"status": -1, "error": "{processing result[error]}"}
           WHERE: id = {item[id]}
\`\`\`

---

## Case Design Tips

### 1. Modular Design
- Encapsulate repeated operations into independent flow segments
- Use variables to pass data

### 2. Error Handling
- Add condition checks to verify key steps
- Set reasonable timeouts and retries
- Use print logs to record key information

### 3. Stability Optimization
- Use "wait for element" instead of fixed waits
- Add appropriate delays to avoid detection
- Handle various exception cases

### 4. Data Validation
- Check data integrity after collection
- Deduplicate
- Format the data`
