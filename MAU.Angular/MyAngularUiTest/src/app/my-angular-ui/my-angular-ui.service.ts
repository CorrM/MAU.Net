import { Injectable, ElementRef, Injector } from '@angular/core';
import { webSocket, WebSocketSubject } from 'rxjs/webSocket';
import { UtilsService } from './utils.service';
import { EventManager } from '@angular/platform-browser';

export let AppInjector: Injector;

enum RequestType {
    None = 0,
    GetEvents = 1,
    EventCallback = 2,
    GetPropValue = 3,
    SetPropValue = 4
}

@Injectable({
    providedIn: 'root'
})
export class MyAngularUiService {
    private static reconnectTime: number = 1;
    private _connected: boolean = false;
    private _subject: WebSocketSubject<any>;

    public Mutation: MutationObserver;
    public UiElements: Map<string, ElementRef>;
    public UiElementEvents: Map<string, string[]>;
    public Port: number;

    constructor(private utils: UtilsService, private injector: Injector, private eventManager: EventManager) {
        this.UiElements = new Map<string, ElementRef>();
        this.UiElementEvents = new Map<string, string[]>();

        AppInjector = this.injector;
        this.Mutation = new MutationObserver((mutations: MutationRecord[]) => {
            mutations.forEach((mutation: MutationRecord) => {
                if (mutation.type == "attributes") {
                    const uiElementId: string = (<HTMLElement>mutation.target).getAttribute("mauuielement");
                    const attribute: string = mutation.attributeName;

                    // Send data to .Net
                    this.GetProp(uiElementId, true, attribute);
                }
                else if (mutation.type == "childList") {
                    const uiElementId: string = (<HTMLElement>mutation.target).getAttribute("mauuielement");

                    // Send data to .Net
                    this.GetProp(uiElementId, false, "innerHTML");
                    this.GetProp(uiElementId, false, "innerText");
                    this.GetProp(uiElementId, false, "textContent");
                }
                else if (mutation.type == "characterData") {
                    let htmlEl: HTMLElement = mutation.target.parentElement;

                    // Get our UiElement Maximum 15Lvl Depth
                    for (let index = 0; index < 15; index++) {
                        if (htmlEl.hasAttribute("mauuielement")) {
                            const uiElementId: string = htmlEl.getAttribute("mauuielement");

                            // Send data to .Net
                            this.GetProp(uiElementId, false, "innerHTML");
                            this.GetProp(uiElementId, false, "innerText");
                            this.GetProp(uiElementId, false, "textContent");
                            return;
                        }
                        else {
                            htmlEl = htmlEl.parentElement;
                        }
                    }
                }
            });
        });
    }

    public Start(port: number): void {
        if (this._subject) {
            return;
        }

        console.log("Connecting: Try to connect");
        this.Port = port;
        this.Connect();
        this.InitElements();
    }

    public Stop(): void {
        this.Mutation.disconnect();
    }

    private Connect(): void {
        this._subject = webSocket({
            url: `ws://localhost:${this.Port}/UiHandler`,
            openObserver: { next: val => { this._connected = true; console.log("opened"); } }
        });
        this._subject.subscribe(
            msg => this.OnMessage(msg),
            err => this.OnError(err),
            () => this.OnClose()
        );
    }

    private OnMessage(msg: any): void {
        console.log(msg);

        // Handle request
        let requestType: RequestType = msg["requestType"];
        let uiElementId: string = msg["uiElementId"];
        let data: any = msg["data"];

        switch (requestType) {
            case RequestType.GetEvents:
                // Set events
                this.UiElementEvents.set(uiElementId, data["events"]);

                // Set event handler
                let events = this.UiElementEvents.get(uiElementId);
                events.forEach((eventName: string) => {
                    let domObj = this.UiElements.get(uiElementId).nativeElement;
                    // ToDo: Add checker to addEventListener, so it's not duplicate event handler
                    this.eventManager.addEventListener(domObj, eventName, (event: Event) => this.FireEvent(uiElementId, event));
                });
                break;

            case RequestType.GetPropValue:
                this.GetProp(uiElementId, data["propIsAttr"], data["propName"]);
                break;

            case RequestType.SetPropValue:
                this.SetProp(uiElementId, data["propIsAttr"], data["propName"], data["propVal"]);
                break;

            default:
                break;
        }
    }

    private OnError(err: any): void {
        this._connected = false;
        console.log(`Error: Reconnecting after ${MyAngularUiService.reconnectTime} sec.`);
        setTimeout(() => this.Connect(), MyAngularUiService.reconnectTime * 1000);
    }

    private OnClose(): void {
        this._connected = false;
        console.log(`Closed: Reconnecting after ${MyAngularUiService.reconnectTime} sec.`);
        setTimeout(() => this.Connect(), MyAngularUiService.reconnectTime * 1000);
    }

    private Send(uiElementId: string, requestType: RequestType, data: any): boolean {
        // Check
        if (!this._connected) {
            console.log(`SendData Can't send to closed socket.`);
            return false;
        }
        if (!this._subject || !this.UiElements.has(uiElementId)) {
            return false;
        }

        // Send
        this._subject.next({
            requestType: requestType,
            uiElementId: uiElementId,
            data: !data ? {} : data
        });
        return true;
    }

    private SendEventCallback(uiElementId: string, eventName: string, eventType: string, data: any): boolean {
        return this.Send(uiElementId, RequestType.EventCallback, { eventName: eventName, eventType: eventType, data: data });
    }

    public AddElement(uiElementId: string, el: ElementRef) {
        this.UiElements.set(uiElementId, el);
        this.UiElementEvents.set(uiElementId, []);
    }

    private InitElements(): void {
        setInterval(() => {
            // Events
            this.UiElementEvents.forEach((events: string[], uiElementId: string) => {
                if (events.length == 0 && this._connected) {
                    this.GetEvents(uiElementId);
                }
            });
        }, 3000)
    }

    private GetEvents(uiElementId: string): void {
        this.Send(uiElementId, RequestType.GetEvents, {});
    }

    private FireEvent(uiElementId: string, event: Event): void {
        let eventName: string = event.type;
        this.SendEventCallback(uiElementId, eventName, event.constructor.name, this.utils.ObjectToJson(event));
    }

    private GetProp(uiElementId: string, propIsAttr: boolean, propName: string): void {
        let val: any;
        if (propIsAttr) {
            val = this.UiElements.get(uiElementId).nativeElement.getAttribute(propName);
        }
        else {
            val = this.UiElements.get(uiElementId).nativeElement[propName];
        }

        this.Send(uiElementId, RequestType.GetPropValue, { propName: propName, propValue: val });
    }

    private SetProp(uiElementId: string, propIsAttr: boolean, propName: string, propVal: string): void {

        if (propIsAttr) {
            this.UiElements.get(uiElementId).nativeElement.setAttribute(propName, propVal);
        }
        else {
            this.UiElements.get(uiElementId).nativeElement[propName] = propVal;
        }
    }
}