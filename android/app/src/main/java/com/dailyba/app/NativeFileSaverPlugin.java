package com.dailyba.app;

import android.app.Activity;
import android.content.Intent;
import android.database.Cursor;
import android.net.Uri;
import android.provider.OpenableColumns;
import android.util.Base64;
import androidx.activity.result.ActivityResult;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;
import java.io.FileInputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;

@CapacitorPlugin(name = "NativeFileSaver")
public class NativeFileSaverPlugin extends Plugin {

    private String pendingContent = null;
    private String pendingCachedPath = null;
    private boolean pendingIsBase64 = false;
    private String pendingFileName = null;

    @PluginMethod
    public void saveWithPicker(PluginCall call) {
        String fileName = call.getString("fileName");
        String mimeType = call.getString("mimeType", "*/*");
        String content = call.getString("content");
        String cachedPath = call.getString("cachedPath");
        boolean isBase64 = Boolean.TRUE.equals(call.getBoolean("isBase64", false));

        if (fileName == null || fileName.isEmpty()) {
            call.reject("Missing fileName parameter");
            return;
        }

        this.pendingFileName = fileName;
        this.pendingContent = content;
        this.pendingCachedPath = cachedPath;
        this.pendingIsBase64 = isBase64;

        Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        intent.setType(mimeType != null && !mimeType.isEmpty() ? mimeType : "*/*");
        intent.putExtra(Intent.EXTRA_TITLE, fileName);

        startActivityForResult(call, intent, "filePickerResult");
    }

    @ActivityCallback
    private void filePickerResult(PluginCall call, ActivityResult result) {
        if (result.getResultCode() == Activity.RESULT_OK && result.getData() != null) {
            Uri uri = result.getData().getData();
            if (uri != null) {
                try {
                    OutputStream os = getContext().getContentResolver().openOutputStream(uri);
                    if (os == null) {
                        call.reject("Cannot open output stream for destination uri");
                        return;
                    }

                    if (pendingCachedPath != null && !pendingCachedPath.isEmpty()) {
                        File cacheFile = new File(pendingCachedPath);
                        if (cacheFile.exists()) {
                            try (InputStream is = new FileInputStream(cacheFile)) {
                                byte[] buf = new byte[8192];
                                int len;
                                while ((len = is.read(buf)) > 0) {
                                    os.write(buf, 0, len);
                                }
                            }
                        } else {
                            Uri cacheUri = Uri.parse(pendingCachedPath);
                            try (InputStream is = getContext().getContentResolver().openInputStream(cacheUri)) {
                                if (is != null) {
                                    byte[] buf = new byte[8192];
                                    int len;
                                    while ((len = is.read(buf)) > 0) {
                                        os.write(buf, 0, len);
                                    }
                                } else {
                                    writeDirectContent(os);
                                }
                            }
                        }
                    } else {
                        writeDirectContent(os);
                    }

                    os.flush();
                    os.close();

                    String savedDisplayName = getDisplayName(uri);
                    String folderLabel = resolveFolderLabel(uri);

                    JSObject ret = new JSObject();
                    ret.put("success", true);
                    ret.put("uri", uri.toString());
                    ret.put("fileName", savedDisplayName != null ? savedDisplayName : pendingFileName);
                    ret.put("location", folderLabel);
                    call.resolve(ret);
                    return;
                } catch (Exception e) {
                    call.reject("Failed writing file: " + e.getMessage());
                    return;
                } finally {
                    cleanPending();
                }
            }
        }

        cleanPending();
        call.reject("User cancelled folder / file selection");
    }

    private void writeDirectContent(OutputStream os) throws Exception {
        if (pendingContent == null) return;
        if (pendingIsBase64) {
            byte[] bytes = Base64.decode(pendingContent, Base64.DEFAULT);
            os.write(bytes);
        } else {
            os.write(pendingContent.getBytes(StandardCharsets.UTF_8));
        }
    }

    private void cleanPending() {
        this.pendingContent = null;
        this.pendingCachedPath = null;
        this.pendingFileName = null;
        this.pendingIsBase64 = false;
    }

    private String getDisplayName(Uri uri) {
        try (Cursor cursor = getContext().getContentResolver().query(uri, null, null, null, null, null)) {
            if (cursor != null && cursor.moveToFirst()) {
                int nameIndex = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME);
                if (nameIndex != -1) {
                    return cursor.getString(nameIndex);
                }
            }
        } catch (Exception ignored) {}
        return null;
    }

    private String resolveFolderLabel(Uri uri) {
        try {
            String path = uri.getPath();
            if (path != null) {
                if (path.contains("primary:")) {
                    String sub = path.substring(path.indexOf("primary:") + 8);
                    int lastSlash = sub.lastIndexOf('/');
                    if (lastSlash > 0) {
                        return sub.substring(0, lastSlash);
                    }
                    return "Internal Storage";
                }
                if (path.toLowerCase().contains("download")) {
                    return "Downloads";
                }
                if (path.toLowerCase().contains("document")) {
                    return "Documents";
                }
            }
        } catch (Exception ignored) {}
        return "Folder Pilihan";
    }
}
