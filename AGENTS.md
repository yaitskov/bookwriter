# An adaptive bookreader app 

## Tmp dir
- use tmp in project root for testing files
## Format
- trim trailing spaces
- add new lines to last line in file

## Don't read 
- word-frequency-table.ts

## TS Modules
- word-frequency-table.ts exports a single dictionary mapping a
  lowercase word to its unigram frequency between 0.0 and 1.0
  
```
export const WFT : { [key: string]: number; } 
```



