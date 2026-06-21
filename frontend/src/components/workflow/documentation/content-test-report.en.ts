export const testReportContentEn = `
# Test Report Module

The Test Report module is based on the Allure framework, helping you generate professional test reports, record the workflow execution process, and analyze test results.

## 📊 Module List

### 1. Allure Init

Initialize the Allure test environment and set the basic information for the test report.

**Configuration:**
- **Results directory**: Directory path for storing test results (default: ./allure-results)
- **Test suite name**: Name of the test suite, used to group test cases
- **Clear existing results**: Whether to delete old test results during initialization

**Notes:**
- You must run initialization before using any other Allure module
- Supports using variables to dynamically set the path and name
- Recommended to run once at the start of the workflow

**Example:**
\`\`\`
Results directory: ./test-results/{get_time}
Test suite: Login Feature Test
Clear existing results: ✓
\`\`\`

---

### 2. Start Test Case

Create a new test case and record the basic information of the test.

**Configuration:**
- **Test case name**: Title of the test case
- **Test case description**: Detailed description of the test purpose and expected result (optional)
- **Severity**: Marks the importance of the test
  - blocker: A serious issue that blocks the system from running
  - critical: A core feature failure
  - normal: A regular feature test
  - minor: A minor feature or optimization
  - trivial: A UI or copywriting issue
- **Test case ID**: A unique identifier for tracking (optional)

**Notes:**
- If a test case is already running, the previous one is ended automatically
- Supports using variables to dynamically set the name and description
- Severity affects the statistics and filtering in the report

**Example:**
\`\`\`
Name: User Login Test
Description: Verify that the user can successfully log in to the system with correct credentials
Severity: critical
Test case ID: TC-LOGIN-001
\`\`\`

---

### 3. Add Test Step

Add detailed test steps to the current test case and record the execution of each operation.

**Configuration:**
- **Step name**: Name of the test step
- **Step description**: Detailed description of the specific operation in this step (optional)
- **Step status**: Marks the execution status of this step
  - passed: The step ran successfully
  - failed: The step failed
  - skipped: The step was skipped
  - broken: The step was interrupted by an exception

**Notes:**
- Must be used after starting a test case
- You can add multiple steps, displayed in execution order
- Failed or broken steps are highlighted in the report
- Supports using variables to record dynamic information

**Example:**
\`\`\`
Step name: Enter username
Step description: Enter admin in the username input box
Step status: passed
\`\`\`

---

### 4. Add Attachment

Add attachments to the test report, such as screenshots and log files, to help analyze test results.

**Configuration:**
- **File path**: Path of the attachment file to add
- **Attachment name**: Name shown in the report (optional, defaults to the file name)
- **Attachment type**: The attachment type, affecting how it is displayed
  - image: Displays an image preview directly in the report
  - text: Displays text content
  - video: Video file
  - JSON: JSON-formatted data
  - XML: XML-formatted data
  - HTML: HTML page

**Notes:**
- Must be used after starting a test case
- The file is copied to the results directory, without affecting the original file
- Supports using variables to specify the file path
- If the file does not exist, a warning is logged but execution is not interrupted

**Example:**
\`\`\`
File path: C:/screenshots/login-{get_time}.png
Attachment name: Login page screenshot
Attachment type: image
\`\`\`

**Common usage:**
\`\`\`
1. Add attachment after a screenshot:
   Screenshot → Add attachment

2. Save a log file:
   Export log → Add attachment

3. Save test data:
   Export table → Add attachment
\`\`\`

---

### 5. End Test Case

Complete the current test case, set the final status, and save the result.

**Configuration:**
- **Test status**: The final status of the test case
  - passed: Test passed
  - failed: Test failed
  - skipped: Test skipped
  - broken: Test interrupted by an exception
- **Failure reason**: If the test failed, describe the reason (optional)

**Notes:**
- The test result is automatically saved to the results directory
- If no test case is running, a warning is returned without raising an error
- When the workflow terminates abnormally, unfinished test cases are automatically marked as broken

**Example:**
\`\`\`
Test status: passed
Failure reason: (leave empty)
\`\`\`

---

### 6. Generate Test Report

Generate a polished HTML test report based on the test results.

**Configuration:**
- **Report directory**: Directory for storing the generated HTML report (default: ./allure-report)
- **Auto-open report**: Automatically open the report in the browser after generation

**Notes:**
- The Allure command-line tool must be installed to generate the report
- Install command: \`npm install -g allure-commandline\`
- Or visit: https://docs.qameta.io/allure/
- If the results directory is empty, an error is returned
- Supports using variables to specify the report directory

**Example:**
\`\`\`
Report directory: ./reports/test-{get_time}
Auto-open report: ✓
\`\`\`

---

## 💡 Full Examples

### Example 1: A Simple Login Test

\`\`\`
1. Allure Init
   - Results directory: ./allure-results
   - Test suite: Login Feature Test
   - Clear existing results: ✓

2. Start Test Case
   - Name: User Login Test
   - Severity: critical

3. Add Test Step
   - Step name: Open login page
   - Step status: passed

4. Open web page
   - URL: https://example.com/login

5. Add Test Step
   - Step name: Enter username
   - Step status: passed

6. Input text
   - Selector: #username
   - Text: admin

7. Add Test Step
   - Step name: Enter password
   - Step status: passed

8. Input text
   - Selector: #password
   - Text: 123456

9. Screenshot
   - Save path: ./screenshots/before-login.png

10. Add Attachment
    - File path: ./screenshots/before-login.png
    - Attachment name: Pre-login screenshot
    - Attachment type: image

11. Add Test Step
    - Step name: Click the login button
    - Step status: passed

12. Click element
    - Selector: #login-btn

13. Wait
    - Wait time: 2 seconds

14. Condition check
    - Condition: element exists
    - Selector: .welcome-message
    - Branches:
      - True:
        15. Add Test Step
            - Step name: Login succeeded
            - Step status: passed
        16. End Test Case
            - Test status: passed
      - False:
        17. Add Test Step
            - Step name: Login failed
            - Step status: failed
        18. Screenshot
            - Save path: ./screenshots/login-failed.png
        19. Add Attachment
            - File path: ./screenshots/login-failed.png
            - Attachment name: Login failure screenshot
        20. End Test Case
            - Test status: failed
            - Failure reason: Welcome message element not found

21. Generate Test Report
    - Report directory: ./allure-report
    - Auto-open report: ✓
\`\`\`

---

### Example 2: Batch Testing Multiple Cases

\`\`\`
1. Allure Init
   - Results directory: ./allure-results
   - Test suite: User Management Feature Test
   - Clear existing results: ✓

2. Set variable
   - Variable name: test_cases
   - Variable value: [
       {"name": "Create user", "username": "user1"},
       {"name": "Edit user", "username": "user2"},
       {"name": "Delete user", "username": "user3"}
     ]

3. Iterate list
   - List variable: test_cases
   - Loop variable: test_case
   - Loop body:
     4. Start Test Case
        - Name: {test_case[name]}
        - Severity: normal
     
     5. Add Test Step
        - Step name: Perform {test_case[name]} operation
        - Step status: passed
     
     6. Print log
        - Log content: Testing: {test_case[name]}
     
     7. Wait
        - Wait time: 1 second
     
     8. End Test Case
        - Test status: passed

9. Generate Test Report
   - Report directory: ./allure-report
   - Auto-open report: ✓
\`\`\`

---

## 🎯 Best Practices

### 1. Test Case Organization

- Use meaningful test case names that clearly describe the test purpose
- Set severity sensibly to facilitate priority management
- Add a unique ID to each test case for easy tracking

### 2. Test Step Recording

- Record key operation steps; do not be overly granular
- Use the description field to add detailed information
- Mark step status promptly when failures occur

### 3. Attachment Management

- Add screenshots on failure to help locate issues
- Save key data files for reproduction
- Use meaningful attachment names

### 4. Report Generation

- Clean up old test results regularly
- Use timestamps to name report directories
- Save important test reports

### 5. Using Variables

- Use variables to dynamically set test data
- Use timestamps to distinguish different test batches
- Use loops to run test cases in batches

---

## ⚠️ Notes

1. **Allure command-line tool**
   - Generating a report requires installing the Allure command-line tool separately
   - Install command: \`npm install -g allure-commandline\`
   - Or visit the official site to download: https://docs.qameta.io/allure/

2. **Initialization order**
   - You must run Allure Init first, then use other modules
   - Recommended to run initialization once at the start of the workflow

3. **Test case management**
   - If you do not end a test case manually, starting a new case automatically ends the previous one
   - When the workflow terminates abnormally, unfinished test cases are marked as broken

4. **File path**
   - The attachment file path must exist and be accessible
   - The file is copied to the results directory, without affecting the original file
   - Supports both relative and absolute paths

5. **Report directory**
   - Generating a report clears the target directory
   - Recommended to use different directories for different report batches
   - You can use variables to name directories dynamically

---

## 🔗 Related Resources

- Allure official docs: https://docs.qameta.io/allure/
- Allure report demo: https://demo.qameta.io/allure/
- Allure GitHub: https://github.com/allure-framework
`
