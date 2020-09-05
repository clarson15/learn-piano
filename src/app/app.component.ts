import { Component, OnInit, NgZone } from '@angular/core';
import * as Tone from 'tone';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  title = 'learn-piano';
  supportsMidi: boolean;
  inputs: WebMidi.MIDIInput[] = [];
  messages: string[] = [];
  private synth: Tone.PolySynth;
  private selectedInput: number;

  constructor(private zone: NgZone) { }

  ngOnInit() {
    if (navigator.requestMIDIAccess) {
      this.supportsMidi = true;
      navigator.requestMIDIAccess().then(x => {
        this.inputs = Array.from(x.inputs.values());
        x.onstatechange = (e) => {
          this.inputs = Array.from(x.inputs.values())
        }
      });
    }
    else {
      this.supportsMidi = false;
    }
  }

  getMidiNoteFrequency(note: number) {
    return Math.pow(2, (note - 69) / 12) * 440;
  }

  onMidiChanged(index: number) {
    if (this.selectedInput != null) {
      this.inputs[this.selectedInput].onmidimessage = null;
    }
    this.selectedInput = index;
    if (this.synth == null) {
      this.synth = new Tone.PolySynth().toDestination();
      Tone.context.lookAhead = 0;
    }
    this.inputs[index].onmidimessage = (message => {
      this.zone.run(() => {
        switch (message.data[0] & 0xF0) {
          case 0x90:
            if (message.data[2] != 0) {
              this.messages.push("note on: " + String(message.data[1]));
              this.synth.triggerAttack(this.getMidiNoteFrequency(message.data[1]), Tone.now());
            }
            else {
              this.messages.push("unknown");
            }
            break;
          case 0x80:
            this.messages.push("note off: " + String(message.data[1]));
            this.synth.triggerRelease(this.getMidiNoteFrequency(message.data[1]), Tone.now());
            break;
          default:
            this.messages.push("unknown");
            break;
        }
      });
    });
  }
}
