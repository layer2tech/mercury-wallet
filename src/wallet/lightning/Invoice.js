import * as ldk from "lightningdevkit";

async function createInvoice(amtMsat, description) {
    // Create an invoice for the specified amount and description
    const invoice = await ldk.invoice.createInvoice({
      value: amtMsat,
      description: description
    });
    
    // Convert the invoice to a string
    const encodedInvoice = invoice.toString();
    
    return encodedInvoice;
  }
  
  // Create an invoice for a payment of 10,000 milli-satoshis with the description "coffee"
  const encodedInvoice = createInvoice(10000, "coffee");