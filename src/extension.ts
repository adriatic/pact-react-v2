import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
  vscode.window.showInformationMessage('PACT ACTIVATED');

  const disposable = vscode.commands.registerCommand('pact.open', () => {
    const panel = vscode.window.createWebviewPanel(
      'pact',
      'PACT',
      vscode.ViewColumn.One,
      {
        enableScripts: false
      }
    );

    panel.webview.html = `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>PACT</title>
        </head>
        <body style="background:#1e1e1e;color:white;font-family:sans-serif;">
          <h1>PACT is running</h1>
        </body>
      </html>
    `;
  });

  context.subscriptions.push(disposable);
}

export function deactivate() {}