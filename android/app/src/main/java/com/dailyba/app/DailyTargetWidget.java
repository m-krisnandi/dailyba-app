package com.dailyba.app;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.widget.RemoteViews;

public class DailyTargetWidget extends AppWidgetProvider {

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId);
        }
    }

    static void updateAppWidget(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.daily_target_widget);

        // 1. Regular launch into record form
        Intent recordIntent = new Intent(context, MainActivity.class);
        recordIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent pendingRecord = PendingIntent.getActivity(
                context,
                0,
                recordIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        // 2. Direct 1-tap launch into AI Receipt Scanner
        Intent scanIntent = new Intent(context, MainActivity.class);
        scanIntent.setAction(Intent.ACTION_VIEW);
        scanIntent.setData(Uri.parse("dailyba://app?action=scan"));
        scanIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent pendingScan = PendingIntent.getActivity(
                context,
                1,
                scanIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        views.setOnClickPendingIntent(R.id.widget_root, pendingRecord);
        views.setOnClickPendingIntent(R.id.widget_quick_record_btn, pendingRecord);
        views.setOnClickPendingIntent(R.id.widget_scan_receipt_btn, pendingScan);

        appWidgetManager.updateAppWidget(appWidgetId, views);
    }
}
