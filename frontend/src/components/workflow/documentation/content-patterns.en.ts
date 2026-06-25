export const workflowPatternsContentEn = `# Workflow Patterns

This chapter introduces common workflow design patterns and best practices to help you build more robust and efficient automation flows.

---

## Basic Patterns

### 1. Sequential Execution Pattern

The simplest pattern: modules execute one after another in order.

\`\`\`
Module A -> Module B -> Module C -> Module D
\`\`\`

**Use cases**:
- Simple linear tasks
- Steps with a strict order

**Example**: Open web page -> Enter search term -> Click search -> Get results

---

### 2. Conditional Branch Pattern

Execute different branches based on a condition.

\`\`\`mermaid
%%{init: {'theme':'default', 'themeVariables': { 'fontSize':'18px'}}}%%
graph TD
    A["<b>Start</b>"] --> B{"<b>Condition Check</b>"}
    B -->|Condition true| C["<b>Branch A</b>"]
    B -->|Condition false| D["<b>Branch B</b>"]
    C --> E["<b>Continue</b>"]
    D --> E
    
    style A fill:#e3f2fd,stroke:#1976d2,stroke-width:3px,color:#000
    style B fill:#fff3e0,stroke:#f57c00,stroke-width:3px,color:#000
    style C fill:#e1f5fe,stroke:#0277bd,stroke-width:3px,color:#000
    style D fill:#fce4ec,stroke:#c2185b,stroke-width:3px,color:#000
    style E fill:#e8f5e9,stroke:#388e3c,stroke-width:3px,color:#000
\`\`\`

**Use cases**:
- Need to handle situations differently
- Error handling and exception cases

**Example**:
\`\`\`
Check login status
  ├─ Logged in -> Run the task directly
  └─ Not logged in -> Log in first, then run the task
\`\`\`

---

### 3. Loop Pattern

Repeatedly execute a flow.

\`\`\`mermaid
%%{init: {'theme':'default', 'themeVariables': { 'fontSize':'18px'}}}%%
graph TD
    A["<b>Loop Start</b>"] --> B["<b>Execute Operation</b>"]
    B --> C{"<b>Continue Loop?</b>"}
    C -->|Yes| B
    C -->|No| D["<b>Loop End</b>"]
    
    style A fill:#e3f2fd,stroke:#1976d2,stroke-width:3px,color:#000
    style B fill:#fff3e0,stroke:#f57c00,stroke-width:3px,color:#000
    style C fill:#f3e5f5,stroke:#7b1fa2,stroke-width:3px,color:#000
    style D fill:#e8f5e9,stroke:#388e3c,stroke-width:3px,color:#000
\`\`\`

**Types**:
- **Count loop**: Execute a fixed number of times
- **Conditional loop**: Continue while the condition is met
- **Iteration loop**: Iterate over list elements

---

## Advanced Patterns

### 4. Retry Pattern

Automatically retry when an operation fails.

\`\`\`
Set variable: retry count = 0
Set variable: max retries = 3

Loop while ({retry count} < {max retries})
  ├─ Execute operation
  ├─ Condition check: operation succeeded?
  │   ├─ Yes -> Break out of the loop
  │   └─ No -> retry count + 1
  │           Wait 2000 ms
  └─ Skip current iteration
\`\`\`

**Configuration tips**:
- Most modules come with built-in retry configuration
- Custom retries allow more flexible control

---

### 5. State Machine Pattern

Decide the next operation based on the current state.

\`\`\`
Set variable: state = "start"

Loop while ({state} != "done")
  ├─ Condition check: {state} == "start"
  │   └─ Run initialization, state = "login"
  ├─ Condition check: {state} == "login"
  │   └─ Run login, state = "collect"
  ├─ Condition check: {state} == "collect"
  │   └─ Run collection, state = "done"
\`\`\`

**Use cases**:
- Complex multi-step flows
- Need to record and resume progress

---

### 6. Producer-Consumer Pattern

Collect data first, then process it.

\`\`\`
Phase 1: Produce (collect data)
  Loop collect -> Add to list

Phase 2: Consume (process data)
  Iterate list -> Process each item
\`\`\`

**Example**:
\`\`\`
// Phase 1: Collect all product links
Set variable: link list = []
Loop through pages
  ├─ Get current page links
  └─ Merge into link list

// Phase 2: Visit each link and collect details
Iterate list: {link list}
  ├─ Open link
  └─ Collect detail data
\`\`\`

**Advantages**:
- Separation of concerns
- Easy to debug and maintain
- Can collect first, then batch process

---

### 7. Pipeline Pattern

Data goes through multiple processing steps, where each step's output is the next step's input.

\`\`\`
Raw data -> Clean -> Transform -> Validate -> Store
\`\`\`

**Example**:
\`\`\`
Get price text: "¥1,299.00"
  Down
Remove symbols: Run JS to strip ¥ and commas
  Down
Convert to number: 1299
  Down
Calculate discount: 1299 * 0.8 = 1039.2
  Down
Save result
\`\`\`

---

## Robustness Patterns

### 8. Defensive Check Pattern

Check preconditions before key operations.

\`\`\`
// Check the page is correct
Condition check: page URL contains "expected-page"
  ├─ Yes -> Continue
  └─ No -> Print error, stop execution

// Check whether the element exists
Wait for element: target element
  ├─ Success -> Continue operation
  └─ Timeout -> Handle exception
\`\`\`

---

### 9. Graceful Degradation Pattern

When the primary method fails, try a fallback method.

\`\`\`
Try method A (preferred)
  ├─ Success -> Continue
  └─ Fail -> Try method B (alternative)
              ├─ Success -> Continue
              └─ Fail -> Try method C (fallback)
\`\`\`

**Example**: Get price
\`\`\`
// Method 1: Get by ID
Get element info: #price
Condition check: success?
  ├─ Yes -> Use result
  └─ No -> Method 2: Get by class name
          Get element info: .product-price
          Condition check: success?
            ├─ Yes -> Use result
            └─ No -> Method 3: Get by XPath
\`\`\`

---

### 10. Resume-from-Breakpoint Pattern

Support resuming execution from where it was interrupted.

\`\`\`
// Read progress
Read variable: processed index (default 0)

// Resume from breakpoint
Iterate list: {data list}
  ├─ Condition check: {current index} < {processed index}
  │   └─ Yes -> Skip current iteration
  ├─ Process current data
  └─ Save progress: processed index = {current index}
\`\`\`

---

## Performance Optimization Patterns

### 11. Batch Processing Pattern

Combine multiple operations to reduce overhead.

\`\`\`
// Bad approach: open a new page for each item
Iterate data
  └─ Open page -> Operate -> Close page

// Good approach: process multiple items on the same page
Open page
Iterate data
  └─ Operate (without closing the page)
Close page
\`\`\`

---

### 12. Cache Pattern

Cache reused data to avoid fetching it repeatedly.

\`\`\`
// Check cache
Condition check: {cached data} exists?
  ├─ Yes -> Use cache
  └─ No -> Fetch data
          Save to cache
\`\`\`

---

### 13. Parallel Execution Pattern

Use the system's true parallel execution capability to handle multiple independent tasks at once.

\`\`\`
        ┌─-> Task A ─┐
Start ──┼─-> Task B ─┼─-> Join & process
        └─-> Task C ─┘
\`\`\`

**How it works**:
- The system is built on an async architecture and supports true parallel execution
- When a node has multiple output connections, they execute in parallel automatically
- The join node waits for all predecessor branches to complete

**Use cases**:
- Multiple independent API requests
- Sending multiple notifications in parallel
- Processing multiple files at once
- Data computation with no dependencies

**Example**: Fetch multiple data sources in parallel
\`\`\`
Start
  ├─-> API request: get user data
  ├─-> API request: get order data
  └─-> API request: get product data
      Down
Join: merge all data and process
\`\`\`

**Notes**:
- Parallelizing browser operations is not recommended (they share the same page)
- Avoid having multiple branches modify the same variable simultaneously
- Do not rely on the completion order of parallel branches

---

## Best Practices

### Naming Conventions

**Variable naming**:
- Use meaningful names
- Keep a consistent naming style
- Examples: \`product_list\`, \`current_page\`, \`login_status\`

**Module naming**:
- Describe the module's specific purpose
- Examples: \`Get product price\`, \`Check login status\`

### Comments and Logs

**Add print logs at key points**:
\`\`\`
Print log: Start processing item {current index}
Print log: Current price: {price}
Print log: Login status: {login status}
\`\`\`

### Error Handling

**Set reasonable timeouts**:
- Page load: 30 seconds
- Element wait: 10 seconds
- API request: 15 seconds

**Set retry counts**:
- Network operations: 3 times
- Click operations: 2 times

### Modularization

**Extract repeated flows**:
- Login flow
- Pagination flow
- Data cleaning flow

### Testing Strategy

1. **Unit testing**: Test a single module
2. **Integration testing**: Test combinations of modules
3. **End-to-end testing**: Test the full flow

**Test steps**:
\`\`\`
1. Test with a small amount of data first
2. Check logs and results
3. Gradually increase the data volume
4. Monitor execution stability
\`\`\`

---

## Pattern Selection Guide

| Scenario | Recommended Pattern |
|------|----------|
| Simple linear task | Sequential execution |
| Need conditional handling | Conditional branch |
| Batch data processing | Loop + iteration |
| Unstable network | Retry pattern |
| Complex multi-step | State machine |
| Large-scale data collection | Producer-Consumer |
| Data transformation | Pipeline pattern |
| Improve stability | Defensive check + graceful degradation |
| Long-running task | Resume from breakpoint |
| Performance optimization | Batch processing + cache |`
