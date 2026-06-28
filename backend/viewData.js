import chromaClient from './config/chromadb.js';

async function checkChromaData() {
  try {
    const collectionName = 'intelligent_pdf_rag';
    console.log(`Connecting to collection: ${collectionName}...`);
    
    const collection = await chromaClient.getCollection({
      name: collectionName
    });

    // Fetch all records stored inside this collection
    const data = await collection.get();

    console.log('\n================ CHROMADB DATA SUMMARY ================');
    console.log(`Total Chunks Stored: ${data.ids.length}`);
    
    if (data.ids.length === 0) {
      console.log('No documents found in this collection.');
      return;
    }

    // Inspect the first few records
    console.log('\n--- Sample Record (Index 0) ---');
    console.log(`ID: ${data.ids[0]}`);
    console.log(`Metadata:`, data.metadatas[0]);
    console.log(`Document Content Snippet:\n${data.documents[0].substring(0, 200)}...`);
    
    console.log('\n--- All Stored File Names ---');
    const uniqueFiles = [...new Set(data.metadatas.map(m => m?.source))];
    console.log(uniqueFiles);
    console.log('========================================================');

  } catch (error) {
    console.error('Error fetching data from ChromaDB:', error);
  }
}

checkChromaData();