import * as FileSystem from "expo-file-system/legacy";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { Platform } from "react-native";
import { api } from "./client";

const base64Alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

function toBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let output = "";
  for (let index = 0; index < bytes.length; index += 3) {
    const a = bytes[index];
    const hasB = index + 1 < bytes.length;
    const hasC = index + 2 < bytes.length;
    const b = hasB ? bytes[index + 1] : 0;
    const c = hasC ? bytes[index + 2] : 0;
    output += base64Alphabet[a >> 2];
    output += base64Alphabet[((a & 3) << 4) | (b >> 4)];
    output += hasB ? base64Alphabet[((b & 15) << 2) | (c >> 6)] : "=";
    output += hasC ? base64Alphabet[c & 63] : "=";
  }
  return output;
}

export async function downloadInvoicePdf(invoice) {
  const { data } = await api.get(`invoices/${invoice.id}/pdf/`, { responseType: "arraybuffer" });
  const safeName = invoice.invoice_number.replaceAll("/", "-");
  const uri = `${FileSystem.documentDirectory}${safeName}.pdf`;
  await FileSystem.writeAsStringAsync(uri, toBase64(data), { encoding: FileSystem.EncodingType.Base64 });
  return uri;
}

export async function shareInvoicePdf(invoice) {
  const uri = await downloadInvoicePdf(invoice);
  if (!(await Sharing.isAvailableAsync())) throw new Error("Sharing is not available on this device.");
  await Sharing.shareAsync(uri, { mimeType: "application/pdf", dialogTitle: invoice.invoice_number });
}

export async function saveInvoicePdf(invoice) {
  const uri = await downloadInvoicePdf(invoice);
  if (Platform.OS === "android") {
    const permission = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
    if (!permission.granted) return false;
    const safeName = invoice.invoice_number.replaceAll("/", "-");
    const destination = await FileSystem.StorageAccessFramework.createFileAsync(permission.directoryUri, `${safeName}.pdf`, "application/pdf");
    const contents = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
    await FileSystem.writeAsStringAsync(destination, contents, { encoding: FileSystem.EncodingType.Base64 });
    return true;
  }
  if (!(await Sharing.isAvailableAsync())) throw new Error("Save to Files is not available on this device.");
  await Sharing.shareAsync(uri, { mimeType: "application/pdf", dialogTitle: `Save ${invoice.invoice_number}` });
  return true;
}

export async function printInvoicePdf(invoice) {
  const uri = await downloadInvoicePdf(invoice);
  await Print.printAsync({ uri });
}
