export const mathFlowGuideContentEn = `# 🔢 Math, Statistics & CSV

---

## ➕ Math operations

| Module | Description |
|------|------|
| math_round | Round (configurable decimals) |
| math_floor | Floor |
| math_modulo | Modulo x % y |
| math_abs | Absolute value |
| math_sqrt | Square root |
| math_power | Power x^y |
| math_log | Logarithm (base 2/10/e) |
| math_trig | Trig functions (sin/cos/tan and inverses) |
| math_exp | Natural exponent e^x |
| math_gcd | Greatest common divisor |
| math_lcm | Least common multiple |
| math_factorial | Factorial n! |
| math_permutation | Permutations P(n,r) |
| math_percentage | Percentage calculation |
| math_clamp | Clamp to a range |
| math_base_convert | Base conversion (2/8/10/16) |
| math_random_advanced | Generate a list of random numbers |

Every math module's config is: **input value** → **result variable**.

**Example** (discounted price):
\`\`\`
Set variable → price = 199
Percentage → value: {price}, total: 100 → discount: 80%
Or simpler with an expression: Set variable → discounted = {price} * 0.8
\`\`\`

---

## 📊 Statistical analysis

| Module | Description |
|------|------|
| stat_median | Median (middle value after sorting) |
| stat_mode | Mode (most frequent value) |
| stat_variance | Variance (spread) |
| stat_stdev | Standard deviation (sqrt of variance) |
| stat_percentile | Percentile (e.g. 75th) |
| stat_normalize | Normalize (map to 0-1) |
| stat_standardize | Standardize (Z-score, mean 0, stdev 1) |

**Config**:

| Parameter | Description |
|------|------|
| Data list | A list variable of numbers |
| Percentile (stat_percentile) | A value 0-100 |
| Result variable | Stores the result |

**Example** (student grade stats):
\`\`\`mermaid
flowchart TD
    A[Read Excel grades] --> B[Extract score list]
    B --> C1[Average\\nlist_average]
    B --> C2[Median\\nstat_median]
    B --> C3[Std dev\\nstat_stdev]
    C1 --> D[Summary output]
    C2 --> D
    C3 --> D
\`\`\`

---

## 📋 CSV processing

### CSV parse (csv_parse)

Parse a CSV string into a list of lists (2D array).

| Parameter | Description | Example |
|------|------|------|
| CSV content | A CSV string variable | \`{file_content}\` |
| Delimiter | Column delimiter (default comma) | \`,\` |
| Has header row | Whether the first row is column names | Yes |
| Result variable | Parsed data (list or list of dicts) | \`csv_data\` |

**Example** (read and process a CSV file):
\`\`\`
Read text file → path: data.csv → result variable: raw_csv
CSV parse → content: {raw_csv}, has header: Yes → result variable: rows
Iterate list → list: {rows}, item var: row
  └── Print log → name: {row["name"]}, age: {row["age"]}
\`\`\`

---

### CSV generate (csv_generate)

Turn list data into a CSV string, or save directly to a CSV file.

| Parameter | Description | Example |
|------|------|------|
| Data | A list or list-of-dicts variable | \`{data_list}\` |
| Delimiter | Column delimiter | \`,\` |
| Include header | Whether to add a header row | Yes |
| Save path | CSV file path (optional) | \`C:\\output.csv\` |
| Result variable | Stores the CSV string or file path | \`csv_result\` |

---

### List to string (advanced) (list_to_string_advanced)

Join a list into a string with a given format, supporting complex delimiters and formatting.

| Parameter | Description | Example |
|------|------|------|
| List variable | The list to join | \`{my_list}\` |
| Delimiter | Joiner | \`\\n\` (newline) |
| Prefix/Suffix | Per-element prefix/suffix | \`- \` |
| Result variable | Stores the string | \`formatted_text\` |

---

## 🎲 Probability trigger (probability_trigger)

Decide, with a given probability, whether the workflow continues — for randomizing behavior.

**Config**:

| Parameter | Description | Example |
|------|------|------|
| Trigger probability | A percentage 0-100 | \`30\` (30% chance) |

**How it works**:
- Has two output ports: **trigger** and **skip**
- Takes the "trigger" branch with the set probability, otherwise "skip"

**Uses**:
- Randomize action intervals to mimic real users
- A/B testing: split traffic randomly
- Random sampling: a 30% chance to do an extra action

---

## 🔄 Iterate dict (foreach_dict)

Iterate all key-value pairs of a dict, getting one key and value per iteration.

**Config**:

| Parameter | Description | Example |
|------|------|------|
| Dict variable | The dict to iterate | \`{my_dict}\` |
| Key var | The key each iteration | \`key\` |
| Value var | The value each iteration | \`value\` |
| Index var | Iteration count (from 0) | \`index\` |

**Example** (process dict data):
\`\`\`
Set variable → config = {"host": "localhost", "port": "8080", "debug": "true"}
Iterate dict → dict: {config}, key: key, value: value
  └── Print log → config item: {key} = {value}
\`\`\`

---

## 💡 Tips

- **Chaining math**: chain modules — the first's result variable feeds the next's input
- **CSV flow**: read file → CSV parse → iterate/process → CSV generate → write file
- **Statistics**: filter invalid data with "list_filter" first, then compute
- **Probability trigger**: adding a 5-30% chance of a random wait in bot actions lowers detection risk`
