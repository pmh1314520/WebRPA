export const customModulesGuideContentEn = `# Custom Modules

Custom modules let you extend WebRPA's capabilities by creating reusable modules.

---

## Overview

### What Is a Custom Module?

A custom module is a reusable workflow snippet created by the user. It can:
- Encapsulate complex logic
- Be reused across multiple workflows
- Have a custom icon and color
- Configure input and output parameters
- Include documentation

### Use Cases

\`\`\`
1. Encapsulate common operations
   - Login flow
   - Data cleaning
   - Format conversion

2. Reuse business logic
   - Order processing
   - Data validation
   - Report generation

3. Team collaboration
   - Share standard flows
   - Unify operation conventions
   - Improve development efficiency
\`\`\`

---

## Quick Start

### Create a Custom Module

1. Click "Custom Modules" in the left sidebar
2. Click the "New Module" button
3. Fill in the module info:
   - Module name
   - Module description
   - Choose an icon
   - Set a color
4. Add workflow nodes
5. Configure input and output parameters
6. Save the module

### Basic Example

**Scenario**: Create a "Log in to Taobao" custom module

\`\`\`yaml
Module name: Log in to Taobao
Module description: Automatically log in to a Taobao account
Icon: 
Color: #FF6B00

Input parameters:
  - username: Username
  - password: Password

Output parameters:
  - login_success: Whether login succeeded

Workflow:
  1. Open page: https://login.taobao.com
  2. Input text: #username -> {username}
  3. Input text: #password -> {password}
  4. Click element: #submit
  5. Wait for element: .user-info
  6. Set variable: login_success = true
\`\`\`

---

## Module Configuration

### Basic Info

**Module name**:
- Concise and clear
- Describes the function
- Avoids duplication

**Module description**:
- Explain the function in detail
- List use cases
- Note any caveats

**Icon selection**:
\`\`\`
Common icons:
Login related
Data processing
Email related
Payment related
Logistics related
Search related
\`\`\`

**Color settings**:
\`\`\`
Suggested colors:
#FF6B00 - Orange (operation type)
#4CAF50 - Green (success type)
#2196F3 - Blue (info type)
#F44336 - Red (warning type)
#9C27B0 - Purple (special type)
\`\`\`

### Input Parameters

Define the input data the module needs.

**Parameter configuration**:
\`\`\`yaml
Parameter name: username
Parameter type: String
Default value: ""
Required: Yes
Parameter description: Login username
\`\`\`

**Parameter types**:
- String
- Number
- Boolean
- List
- Dictionary
- File path

**Using input parameters**:
\`\`\`
Reference with {parameter name} inside the module:
Input text: {username}
Condition check: {enable_cache} == true
\`\`\`

### Output Parameters

Define the data the module returns after execution.

**Parameter configuration**:
\`\`\`yaml
Parameter name: result_data
Parameter type: Dictionary
Parameter description: The processed data
\`\`\`

**Setting output parameters**:
\`\`\`
Use the "Set Variable" module inside the module:
Set variable: result_data = {processing result}
\`\`\`

**Using output parameters**:
\`\`\`
After calling the module:
Print log: result={result_data}
Condition check: {result_data.success} == true
\`\`\`

---

## Module Development

### Workflow Design

**Internal structure of a module**:
\`\`\`
1. Parameter validation
   └─ Check required parameters
   └─ Validate parameter format

2. Main logic
   └─ Execute the core function
   └─ Handle exceptions

3. Return results
   └─ Set output parameters
   └─ Log the execution
\`\`\`

**Example: Data cleaning module**:
\`\`\`
Input: raw_data (raw data)
Output: clean_data (cleaned data)

Flow:
1. Condition check: is {raw_data} empty
   └─ True -> Set variable: clean_data = []
   └─ False -> Continue processing

2. Iterate list: {raw_data}
   └─ String replace: remove spaces
   └─ String replace: unify case
   └─ List operation: add to result list

3. Set variable: clean_data = {result list}
4. Print log: Cleaning complete, total {clean_data.length} items
\`\`\`

### Error Handling

**Add error handling**:
\`\`\`
1. Condition check: check key data
   └─ False -> Set variable: error_message = "Invalid data"
   └─ False -> Break out of the loop

2. Add at the end:
   Condition check: {error_message} is not empty
   └─ True -> Print log: error={error_message}
\`\`\`

### Logging

**Add key logs**:
\`\`\`
Print log: [Module name] starting
Print log: [Module name] parameters: {parameter list}
Print log: [Module name] processing...
Print log: [Module name] done, result: {result}
\`\`\`

---

## Module Management

### Module List

Shows all custom modules:
- Module name and icon
- Module description
- Creation time
- Usage count

### Module Operations

**Edit module**:
- Modify configuration
- Update workflow
- Adjust parameters

**Copy module**:
- Quickly create a similar module
- Keep the original module

**Export module**:
- Export as a JSON file
- Share with others
- Back up the module

**Import module**:
- Import from a JSON file
- Batch import

**Delete module**:
- Permanently delete the module
- Does not affect workflows already using it

### Module Categories

**Categorize with tags**:
\`\`\`
Login type: 
Data type: 
Notification type: 
Payment type: 
\`\`\`

---

## Using Custom Modules

### Add to a Workflow

**Method 1: Drag from the sidebar**
1. Find the custom module in the left sidebar
2. Drag it onto the canvas

**Method 2: Double-click the canvas**
1. Double-click an empty area of the canvas
2. Select it in the pop-up module picker
3. Custom modules appear in the list

**Method 3: Right-click menu**
1. Right-click the canvas
2. Choose "Add Module"
3. Select the custom module

### Configure Module Parameters

**Input parameter configuration**:
\`\`\`
Module: Log in to Taobao
Parameters:
  username: {username variable}
  password: {password variable}
\`\`\`

**Using output parameters**:
\`\`\`
Log in to Taobao -> Condition check
Condition: {login_success} == true
  └─ True -> Continue with subsequent operations
  └─ False -> Send a failure notification
\`\`\`

---

## Best Practices

### 1. Single Responsibility

\`\`\`
[×] Not recommended: one module doing too much
[√] Recommended: each module does one thing

Example:
- Login module: only handles login
- Data collection module: only collects
- Data processing module: only processes
\`\`\`

### 2. Parameterized Design

\`\`\`
[×] Not recommended: hardcoded config
[√] Recommended: use parameters

Example:
[×] Open page: https://example.com
[√] Open page: {base_url}
\`\`\`

### 3. Thorough Documentation

\`\`\`
The module description should include:
- Function explanation
- Parameter descriptions
- Usage examples
- Caveats
\`\`\`

### 4. Error Handling

\`\`\`
Cases that must be handled:
- Empty parameters
- Network errors
- Element not found
- Invalid data format
\`\`\`

### 5. Version Management

\`\`\`
Recommendations:
- Include a version number in the module name
- Create a new module for major updates
- Keep old versions for compatibility
\`\`\`

---

## Module Updates

### Update Strategy

**Backward compatibility**:
\`\`\`
[√] You can:
- Add new parameters (with default values)
- Optimize internal logic
- Fix bugs

[×] Avoid:
- Removing parameters
- Changing parameter types
- Changing the output format
\`\`\`

**Version control**:
\`\`\`
Naming convention:
- Log in to Taobao v1.0
- Log in to Taobao v2.0
- Log in to Taobao v2.1
\`\`\`

---

## Practical Cases

### Case 1: Generic Login Module

\`\`\`yaml
Module name: Generic Website Login
Icon: 
Color: #FF6B00

Input parameters:
  - login_url: Login page URL
  - username_selector: Username input selector
  - password_selector: Password input selector
  - submit_selector: Submit button selector
  - username: Username
  - password: Password

Output parameters:
  - login_success: Whether login succeeded

Workflow:
  1. Open page: {login_url}
  2. Input text: {username_selector} -> {username}
  3. Input text: {password_selector} -> {password}
  4. Click element: {submit_selector}
  5. Wait: 3 seconds
  6. Set variable: login_success = true
\`\`\`

### Case 2: Data Validation Module

\`\`\`yaml
Module name: Data Format Validation
Icon: [√]
Color: #4CAF50

Input parameters:
  - data: The data to validate
  - required_fields: List of required fields

Output parameters:
  - is_valid: Whether valid
  - error_message: Error message

Workflow:
  1. Set variable: is_valid = true
  2. Set variable: error_message = ""
  3. Iterate list: {required_fields}
     └─ Condition check: {data[current field]} is empty
        └─ True -> Set variable: is_valid = false
        └─ True -> Set variable: error_message = "Missing field: {current field}"
        └─ True -> Break out of the loop
\`\`\`

### Case 3: Notification Sending Module

\`\`\`yaml
Module name: Multi-channel Notification
Icon: 
Color: #2196F3

Input parameters:
  - title: Notification title
  - content: Notification content
  - channels: List of channels ["email", "wechat", "dingtalk"]

Output parameters:
  - send_success: Whether sending succeeded
  - failed_channels: Failed channels

Workflow:
  1. Set variable: failed_channels = []
  2. Iterate list: {channels}
     └─ Condition check: {current channel} == "email"
        └─ True -> Send email
     └─ Condition check: {current channel} == "wechat"
        └─ True -> WeCom notification
     └─ Condition check: {current channel} == "dingtalk"
        └─ True -> DingTalk notification
  3. Set variable: send_success = {failed_channels.length} == 0
\`\`\`

---

## FAQ

### Module Not Found

**Causes**:
- The module was deleted
- The module file is corrupted

**Solutions**:
- Recreate the module
- Restore from a backup

### Parameter Passing Failed

**Causes**:
- Parameter name mismatch
- Wrong parameter type

**Solutions**:
- Check the parameter names
- Verify the parameter types
- Check the execution logs

### Module Execution Failed

**Debugging methods**:
\`\`\`
1. Add logs inside the module
2. Check the input parameter values
3. Test the module in isolation
4. Review the error message
\`\`\`

---

## Online Community (Publish / Browse / Download)

Share the modules you encapsulate with other users, and download modules others share with a single click.

### Entry Point

Top bar "Workflow Repository" -> "Modules" tab -> toggle "Local Modules / Online Community" at the top.

### How to Publish Your Module

\`\`\`
1. Have a local custom module first
   - Select some nodes on the canvas -> encapsulate as a custom module (fill in name/icon/parameters/outputs)
2. Open "Workflow Repository -> Modules -> Local Modules"
3. Click the purple "Publish" button on the module card
4. Fill in the author name in the dialog -> "Confirm Publish"
\`\`\`

> Republishing a module with identical content by yourself is idempotent (it shows "Already up to date") and does not create duplicates.

### Browse and Download

\`\`\`
Switch to "Online Community":
- Search / Category / Sort (Newest / Hottest / Most Downloaded)
- "All Modules" browses everyone's shares; "My Published" manages your own
- Click "Download to Local" on a card -> it is automatically imported into the local module repository and ready to use
\`\`\`

### Comments / Ratings / Reports

\`\`\`
Click the card title or the comment icon to open "Details":
- View the overall rating and the comment list
- Post a comment and give 1-5 stars
- Delete your own comments
- "Report" a violating/malicious module
\`\`\`

### Version Updates and Favorites

\`\`\`
- In "My Published", click "Edit" to update the name/description/category/tags/version number (version update)
- Any community module can be "Favorited" (saved locally); favorited ones are automatically pinned to the top
- In "My Published", you can delete your published modules from the community
\`\`\`

> Note: Community data uses a cloud-based sharing service and requires the server to be deployed before it can connect; creating/using/importing/exporting local modules does not depend on the network.

---

## Related Docs

- [Variable System Explained](variables-guide) - Parameter passing
- [Advanced Features](advanced-features) - Sub-flows
- [Debugging and Error Handling](debug-guide) - Module debugging
`
