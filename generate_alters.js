const fs = require('fs')
const path = require('path')

const entityDir = 'server/src/main/java/com/store/api/entity'
const files = fs.readdirSync(entityDir).filter(f => f.endsWith('.java'))

const convertToSnake = str => str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`)
const pluralize = word => {
   if (word.endsWith('y')) return word.slice(0, -1) + 'ies'
   if (word.endsWith('s')) return word + 'es'
   return word + 's'
}

let alters = []

for (const file of files) {
  const filePath = path.join(entityDir, file)
  const content = fs.readFileSync(filePath, 'utf8')
  
  const className = file.replace('.java', '')
  // Support custom @Table(name = "...") if needed, otherwise pluralize
  let tableName = pluralize(convertToSnake(className))
  
  const tableMatch = content.match(/@Table\(name\s*=\s*"([^"]+)"\)/)
  if (tableMatch) {
     tableName = tableMatch[1]
  }

  const lines = content.split('\n')
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (line.includes('@Column') && line.includes('length')) {
      const match = line.match(/length\s*=\s*(\d+)/)
      if (match) {
         let size = match[1]
         const propLine = lines[i+1] || ''
         if (propLine.includes('private String')) {
             let prop = propLine.trim().split(' ')[2].replace(';', '')
             let fieldName = convertToSnake(prop)
             
             // Check if @Column already specifies a name="xxx"
             const nameMatch = line.match(/name\s*=\s*"([^"]+)"/)
             if (nameMatch) {
                 fieldName = nameMatch[1]
             }
             
             alters.push(`"ALTER TABLE ${tableName} ALTER COLUMN ${fieldName} TYPE VARCHAR(${size})"`)
         }
      }
    }
  }
}

// Write to DbAutoShrink.java
const shrinkPath = 'server/src/main/java/com/store/api/config/DbAutoShrink.java'
let javaCode = fs.readFileSync(shrinkPath, 'utf8')

const begin = javaCode.indexOf('String[] alters = {')
const end = javaCode.indexOf('};', begin)

const newCode = javaCode.substring(0, Math.max(0, begin)) + 'String[] alters = {\n            ' + alters.join(',\n            ') + '\n        ' + javaCode.substring(Math.max(0, end));

fs.writeFileSync(shrinkPath, newCode, 'utf8')
console.log(`Generated ${alters.length} alter statements.`)
