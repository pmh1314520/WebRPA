export const debugGuideContentEn = `# Debugging & Error Handling

This chapter covers debugging workflows, handling errors and optimizing performance.

---

## Log panel

The log panel is the core debugging tool, at the bottom of the interface.

### Log tab

Shows all log messages during a run.

**Log levels**:
| Level | Color | Use |
|------|------|------|
| info | Blue | General info |
| success | Green | Successful operation |
| warning | Yellow | Warning |
| error | Red | Error |

### Data table tab

Shows collected data with live preview, manual editing and CSV export.

### Variables tab

Shows all variables and current values: live updates, type display, manual add/edit.

---

## Debugging tips

### 1. Print log

Add "Print log" modules at key points:
\`\`\`
Print log: start processing record {index}
Print log: name={name}, price={price}
Print log: API response={responseData}
\`\`\`

### 2. Step-by-step

Split a complex workflow into small pieces to test:
\`\`\`
Step 1: test only opening the page
Step 2: add data extraction
Step 3: add loop logic
Step 4: add data saving
\`\`\`

### 3. Variable monitoring

Watch variables live in the variables panel:
- Confirm variables are created correctly
- Check values match expectations
- Spot data-type issues

### 4. Variable tracking

Use the variable-tracking panel for deep analysis:

**Open it**: click "More" in the toolbar -> "Variable tracking".

**Features**:
- Records the create/update history of all variables
- Filter by variable name, module name, action type
- Shows the timestamp and module of each change
- Counts how many times each variable changed
- Export to JSON

**Use cases**:
\`\`\`
1. Debug variable changes inside loops
2. Trace a data-processing flow
3. Locate where a variable was unexpectedly modified
4. Analyze a variable's full lifecycle
\`\`\`

**Example**:
\`\`\`
Variable tracking shows:
- [09:30:15] create price = 99.9 (Set variable module)
- [09:30:16] update price = 89.9 (Extract data module)
- [09:30:17] update price = 79.9 (String replace module)
\`\`\`

### 5. Conditional breakpoint

Use a condition to create a "breakpoint":
\`\`\`
Condition: {debugMode} == true
  └─ true -> User input (pause and wait)
\`\`\`

---

## Common errors

### Element not found

**Error**:
\`\`\`
Element not found: #selector
Timeout waiting for element
\`\`\`

**Causes**: wrong selector; element not loaded yet; element in an iframe; page structure changed.

**Fixes**:
\`\`\`
1. Reselect with the element picker
2. Add a "Wait for element" module
3. Increase the wait time
4. Check whether the page loaded properly
\`\`\`

### Timeout error

**Error**:
\`\`\`
Timeout 60000ms exceeded
Navigation timeout
Execution timeout (65000ms > 60000ms)
\`\`\`

**Causes**: slow network; long page load; a wait condition never met.

**Fixes**:
\`\`\`
1. Increase the timeout
2. Use a looser wait condition
3. Check the network
4. Optimize the selector
\`\`\`

**Modules not subject to timeout**:

These don't trigger timeout errors (they exist to wait or control flow):

| Module type | Note |
|----------|------|
| Fixed wait | It's a wait module |
| Wait for element | Has its own wait logic |
| Scheduled run | For scheduled tasks |
| User input | Waits for the user |
| Loop/iterate | Flow-control modules |
| Condition | Instant |
| Print log | Instant |
| Set variable | Instant |

### Variable undefined

**Error**:
\`\`\`
Variable 'xxx' is not defined
Cannot read property of undefined
\`\`\`

**Causes**: misspelled name; variable not created; scope issue.

**Fixes**:
\`\`\`
1. Check the spelling
2. Ensure it's created before use
3. Check loop-variable scope
\`\`\`

### Type error

**Error**:
\`\`\`
Cannot compare string with number
Invalid JSON format
\`\`\`

**Causes**: mismatched types; bad JSON; poor null handling.

**Fixes**:
\`\`\`
1. Ensure compared types match
2. Validate the JSON
3. Add null checks
\`\`\`

---

## Error-handling strategies

### 1. Preventive checks

Check conditions before acting:
\`\`\`
Condition: {elementExists} == true
  ├─ true -> click
  └─ false -> print a warning
\`\`\`

### 2. Retry mechanism

Use a loop to retry operations that may fail:
\`\`\`
Set variable: retries = 0
Set variable: success = false

While loop: {success} == false AND {retries} < 3
  ├─ try the operation
  ├─ Condition: did it succeed?
  │   ├─ yes -> Set variable: success = true
  │   └─ no -> Set variable: retries = {retries} + 1
  │           Wait 2000 ms
\`\`\`

### 3. Graceful degradation

When the main method fails, try a fallback:
\`\`\`
Try method A
Condition: A succeeded?
  ├─ yes -> continue
  └─ no -> try method B
          Condition: B succeeded?
            ├─ yes -> continue
            └─ no -> log the error, skip
\`\`\`

### 4. Error logging

Record detailed error info:
\`\`\`
Print log (error level):
  Operation failed
  - Module: Get element info
  - Selector: {selector}
  - Page URL: {currentUrl}
  - Time: {currentTime}
\`\`\`

---

## Performance optimization

### Reduce wait time

\`\`\`
[×] Not recommended:
Wait 5000 ms (fixed)

[√] Recommended:
Wait for element #content to appear (smart)
\`\`\`

### Optimize selectors

\`\`\`
[×] Slow:
body > div > div > div > ul > li:nth-child(1) > a

[√] Fast:
#menu > li:first-child > a
.nav-item.active
\`\`\`

### Batch operations

\`\`\`
[×] Inefficient:
loop 100 times, save one record each time

[√] Efficient:
loop 100 times to collect, save once at the end
\`\`\`

### Reasonable parallelism

\`\`\`
Independent tasks can run in parallel:
  ├─ Task A (independent)
  ├─ Task B (independent)
  └─ Task C (independent)

Dependent tasks must run in order:
Task A -> Task B (depends on A) -> Task C
\`\`\`

---

## Monitoring & stats

### Execution time

Record the time of key operations in the log:
\`\`\`
Get time -> save to: startTime
run operations...
Get time -> save to: endTime
Print log: elapsed = {endTime} - {startTime}
\`\`\`

### Success-rate stats

\`\`\`
Set variable: total = 0
Set variable: success = 0

Loop
  ├─ Set variable: total = {total} + 1
  ├─ run operation
  ├─ Condition: succeeded?
  │   └─ yes -> Set variable: success = {success} + 1

Print log: success rate = {success}/{total}
\`\`\`

---

## Debug checklist

Before running:
- [ ] Are the selectors correct?
- [ ] Are variable names spelled right?
- [ ] Is the wait time enough?
- [ ] Will loop conditions terminate?
- [ ] Do data types match?

After a failure:
- [ ] Read the error log
- [ ] Check the variables panel
- [ ] Confirm the page state
- [ ] Verify the network
- [ ] Try the same action manually

---

## Debugging best practices

### 1. Start simple

Get the simplest version working, then add features step by step.

### 2. Save intermediate state

Export data periodically to avoid losing everything.

### 3. Use meaningful logs

\`\`\`
[×] Bad:
Print log: 111
Print log: got here

[√] Good:
Print log: [Step 1] start login
Print log: [Step 2] logged in, user={username}
\`\`\`

### 4. Version control

Export workflow backups periodically for easy rollback.

### 5. Document

Add notes to complex workflows (using group modules).`
