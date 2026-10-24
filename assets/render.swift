import AppKit
import WebKit

// render <page.html> <out.png> <width>
// Loads the page in an offscreen WKWebView, waits until the page sets
// body[data-h] (card height) or body[data-err], then snapshots that rect.

func fail(_ message: String) -> Never {
    FileHandle.standardError.write(Data((message + "\n").utf8))
    exit(1)
}

let args = CommandLine.arguments
guard args.count == 4, let width = Double(args[3]), width > 0 else { fail("usage: render <page.html> <out.png> <width>") }
let pageURL = URL(fileURLWithPath: args[1])
let outURL = URL(fileURLWithPath: args[2])

let app = NSApplication.shared
app.setActivationPolicy(.accessory)

let web = WKWebView(frame: NSRect(x: 0, y: 0, width: width, height: 1200))
let window = NSWindow(contentRect: web.frame, styleMask: [.borderless], backing: .buffered, defer: false)
window.contentView = web
window.setFrameOrigin(NSPoint(x: -30000, y: -30000))
window.orderBack(nil)

@MainActor func snapshot(height: Double) {
    web.setFrameSize(NSSize(width: width, height: height))
    DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) {
        let config = WKSnapshotConfiguration()
        config.rect = CGRect(x: 0, y: 0, width: width, height: height)
        config.snapshotWidth = NSNumber(value: width)
        config.afterScreenUpdates = true
        web.takeSnapshot(with: config) { image, error in
            guard let image, let cg = image.cgImage(forProposedRect: nil, context: nil, hints: nil) else {
                fail("snapshot failed: \(error?.localizedDescription ?? "no image")")
            }
            guard let png = NSBitmapImageRep(cgImage: cg).representation(using: .png, properties: [:]) else {
                fail("png encoding failed")
            }
            do { try png.write(to: outURL) } catch { fail("write failed: \(error.localizedDescription)") }
            exit(0)
        }
    }
}

let deadline = Date().addingTimeInterval(30)
var snapshotting = false
Timer.scheduledTimer(withTimeInterval: 0.1, repeats: true) { _ in
    if Date() > deadline { fail("timed out waiting for the post to render") }
    let probe = "document.body.getAttribute('data-err') ? 'E' + document.body.getAttribute('data-err') : 'H' + (document.body.getAttribute('data-h') || '')"
    web.evaluateJavaScript(probe) { result, _ in
        guard !snapshotting, let value = result as? String, let kind = value.first else { return }
        if kind == "E" { fail("page error: " + value.dropFirst()) }
        guard let height = Double(value.dropFirst()), height > 0 else { return }
        snapshotting = true
        snapshot(height: height)
    }
}

web.loadFileURL(pageURL, allowingReadAccessTo: pageURL.deletingLastPathComponent())
app.run()
