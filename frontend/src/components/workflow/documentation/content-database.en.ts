export const databaseGuideContentEn = `# Database Operations Guide

This chapter covers using the database modules to connect to and operate a MySQL database.

---

## Module overview

WebRPA provides a complete set of database modules:

| Module | Description | Main use |
|------|------|----------|
| Connect database | Establish a connection | Connect to a MySQL server |
| Query data | SELECT query | Read data |
| Execute SQL | Run any SQL | DDL, stored procedures, etc. |
| Insert data | INSERT | Add records |
| Update data | UPDATE | Modify records |
| Delete data | DELETE | Remove records |
| Close connection | Disconnect | Free connection resources |

---

## Connect database

Establish a connection to MySQL — required before any database operation.

### Config

| Parameter | Description | Default | Example |
|------|------|--------|------|
| Host | Database server address | localhost | \`192.168.1.100\` |
| Port | Database port | 3306 | \`3306\` |
| Username | Login username | - | \`root\` |
| Password | Login password | - | \`password123\` |
| Database | The database to connect | - | \`mydb\` |
| Charset | Connection charset | utf8mb4 | \`utf8mb4\` |
| Connection name | Connection identifier | default | \`primary\` |

### What the connection name is for

The connection name distinguishes multiple connections. When operating multiple databases, create multiple connections:

\`\`\`
Connect database 1:
  Host: 192.168.1.100
  Database: users_db
  Connection name: userDB

Connect database 2:
  Host: 192.168.1.101
  Database: orders_db
  Connection name: orderDB

In later operations, specify the connection name to use the right database
\`\`\`

### Global defaults

Set default connection parameters under **Global settings -> Database**; new database modules auto-fill them.

### Example

\`\`\`
Connect database:
  Host: localhost
  Port: 3306
  Username: root
  Password: {dbPassword}
  Database: web_rpa
  Connection name: default
\`\`\`

---

## Query data

Run a SELECT query.

### Config

| Parameter | Description | Example |
|------|------|------|
| Connection name | Which connection to use | \`default\` |
| SQL | The SELECT statement | \`SELECT * FROM users\` |
| Save result to variable | Variable for the result | \`userList\` |
| Only first row | Take only the first record | checked/unchecked |

### Result format

**Multiple rows** (unchecked):
\`\`\`json
[
  {"id": 1, "name": "John", "email": "john@example.com"},
  {"id": 2, "name": "Jane", "email": "jane@example.com"}
]
\`\`\`

**Single row** (checked):
\`\`\`json
{"id": 1, "name": "John", "email": "john@example.com"}
\`\`\`

### Using variables

Use \`{name}\` in SQL to reference variables:
\`\`\`sql
SELECT * FROM users WHERE id = {userId}
SELECT * FROM products WHERE price < {maxPrice}
SELECT * FROM orders WHERE status = '{orderStatus}'
\`\`\`

### Access the result

\`\`\`
Assume the result is saved to: userList

Iterate:
  Iterate: userList
    Print log: name: {item[name]}, email: {item[email]}

Access a single record (with "Only first row" checked):
  Print log: name: {user[name]}
\`\`\`

### Common queries

**Select all**:
\`\`\`sql
SELECT * FROM users
\`\`\`

**Conditional**:
\`\`\`sql
SELECT * FROM users WHERE age > 18 AND status = 1
\`\`\`

**Sort and limit**:
\`\`\`sql
SELECT * FROM products ORDER BY price DESC LIMIT 10
\`\`\`

**Join**:
\`\`\`sql
SELECT u.name, o.order_no, o.amount 
FROM users u 
JOIN orders o ON u.id = o.user_id 
WHERE o.status = 'paid'
\`\`\`

**Aggregate**:
\`\`\`sql
SELECT COUNT(*) as total, SUM(amount) as total_amount 
FROM orders 
WHERE created_at > '2024-01-01'
\`\`\`

---

## Execute SQL

Run any SQL — for DDL, stored procedures, etc.

### Config

| Parameter | Description | Example |
|------|------|------|
| Connection name | Which connection to use | \`default\` |
| SQL | The SQL to run | \`CREATE TABLE ...\` |
| Affected rows to variable | Stores the affected-row count | \`affectedRows\` |

### Use cases

- Create/alter/drop table structures
- Run stored procedures
- Bulk operations
- Other non-query SQL

### Examples

**Create a table**:
\`\`\`sql
CREATE TABLE IF NOT EXISTS logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
\`\`\`

**Alter a table**:
\`\`\`sql
ALTER TABLE users ADD COLUMN phone VARCHAR(20)
\`\`\`

**Truncate**:
\`\`\`sql
TRUNCATE TABLE temp_data
\`\`\`

---

## Insert data

Insert new records into a table.

### Config

| Parameter | Description | Example |
|------|------|------|
| Connection name | Which connection to use | \`default\` |
| Table | The table to insert into | \`users\` |
| Insert data | Data as JSON | \`{"name": "John"}\` |
| Insert ID to variable | Stores the auto-increment ID | \`lastInsertId\` |

### Data format

Specify fields and values as JSON:
\`\`\`json
{
  "name": "{userName}",
  "email": "{email}",
  "age": 25,
  "status": 1
}
\`\`\`

### Example

\`\`\`
Insert data:
  Table: users
  Data: {
    "name": "{scrapedName}",
    "email": "{scrapedEmail}",
    "source": "web_rpa",
    "created_at": "{currentTime}"
  }
  Insert ID to: newUserId

Print log: inserted user, ID: {newUserId}
\`\`\`

### Batch insert

Combine with a loop:
\`\`\`
Iterate: collectedData
  Insert data:
    Table: products
    Data: {
      "name": "{item[productName]}",
      "price": "{item[price]}",
      "url": "{item[link]}"
    }
\`\`\`

---

## Update data

Modify existing records.

### Config

| Parameter | Description | Example |
|------|------|------|
| Connection name | Which connection to use | \`default\` |
| Table | The table to update | \`users\` |
| Update data | Update content as JSON | \`{"status": 1}\` |
| WHERE condition | The condition (without WHERE) | \`id = 1\` |
| Affected rows to variable | Stores the affected-row count | \`updatedRows\` |

### Examples

**Update one record**:
\`\`\`
Update data:
  Table: users
  Data: {"status": 1, "updated_at": "{currentTime}"}
  WHERE: id = {userId}
\`\`\`

**Bulk update**:
\`\`\`
Update data:
  Table: products
  Data: {"on_sale": 0}
  WHERE: stock = 0
\`\`\`

### Notes

- Don't include the \`WHERE\` keyword in the condition
- String values in the condition need quotes
- Confirm the target rows with a query first

---

## Delete data

Delete records from a table.

### Config

| Parameter | Description | Example |
|------|------|------|
| Connection name | Which connection to use | \`default\` |
| Table | The table to delete from | \`users\` |
| WHERE condition | The condition (required) | \`id = 1\` |
| Affected rows to variable | Stores the deleted-row count | \`deletedRows\` |

### Example

\`\`\`
Delete data:
  Table: logs
  WHERE: created_at < '2024-01-01'
  Affected rows to: deletedCount

Print log: deleted {deletedCount} expired logs
\`\`\`

### Safety warning

- **The WHERE condition is required** to prevent deleting the whole table
- Deletion is irreversible — use with care
- Confirm the target rows with a query first

---

## Close connection

Disconnect and free resources.

| Parameter | Description | Example |
|------|------|------|
| Connection name | The connection to close | \`default\` |

### Tips

- Close the connection when the workflow ends
- In long-running workflows, close connections when not in use
- If you don't close manually, all connections close when the workflow ends

---

## Best practices

### 1. Connection management

\`\`\`
Workflow start
  └─ Connect database
      └─ run database operations...
          └─ Close connection
              └─ Workflow end
\`\`\`

### 2. Error handling

Check the result after key operations:
\`\`\`
Insert data -> save ID to: insertId
Condition: {insertId} > 0
  ├─ yes -> Print log (success): inserted
  └─ no -> Print log (error): insert failed
\`\`\`

### 3. Prevent SQL injection

The module handles parameters, but still:
- Don't concatenate user input into SQL directly
- Use variable references, not string concatenation
- Validate user input

### 4. Performance

- Query only needed fields, avoid \`SELECT *\`
- Use indexes appropriately
- Consider transactions for bulk operations
- Use pagination for large data

---

## Practical cases

### Case 1: scrape data into the database

\`\`\`
1. Connect database
2. Open page -> product list
3. Iterate products
   ├─ Get product name
   ├─ Get product price
   ├─ Get product link
   └─ Insert data:
        Table: products
        Data: {
          "name": "{productName}",
          "price": "{price}",
          "url": "{link}",
          "created_at": "{currentTime}"
        }
4. Close connection
5. Print log: done
\`\`\`

### Case 2: data sync

\`\`\`
1. Connect database
2. Query: SELECT * FROM products WHERE sync_status = 0
3. Iterate results
   ├─ HTTP request: sync to a remote server
   └─ Update data:
        Table: products
        Data: {"sync_status": 1}
        WHERE: id = {item[id]}
4. Close connection
\`\`\`

### Case 3: scheduled cleanup

\`\`\`
1. Connect database
2. Get time -> the date 30 days ago
3. Delete data:
     Table: logs
     WHERE: created_at < '{thirtyDaysAgo}'
4. Print log: cleaned {deletedRows} expired logs
5. Close connection
\`\`\`

---

## FAQ

### Q: Connection fails?

1. Check the database service is running
2. Check the host and port
3. Check the username and password
4. Check the database allows remote connections
5. Check the firewall

### Q: Garbled Chinese?

Ensure the charset is \`utf8mb4\`, and the table charset is also \`utf8mb4\`.

### Q: How to handle large data?

1. Paginate: \`LIMIT offset, count\`
2. Use a cursor
3. Process in batches to avoid loading too much at once

### Q: Other databases?

Currently MySQL is supported. For others (PostgreSQL, SQLite, etc.), contact the author.`
