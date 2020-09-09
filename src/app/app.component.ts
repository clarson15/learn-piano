import { Component, OnInit, NgZone, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import * as Tone from 'tone';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit, AfterViewInit {

  @ViewChild('canvasElement', { static: false }) canvas: ElementRef<HTMLCanvasElement>;

  title = 'learn-piano';
  supportsMidi: boolean;
  inputs: WebMidi.MIDIInput[] = [];
  private synth: Tone.PolySynth;
  private selectedInput: number;
  private ctx: CanvasRenderingContext2D;
  private imgStaff: HTMLImageElement;
  private notesOn: number[] = [];

  constructor(private zone: NgZone) { }

  drawFrame() {
    this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
    this.ctx.drawImage(this.imgStaff, 0, 0);
    this.ctx.strokeStyle = 'red';
    this.ctx.lineWidth = 5;
    this.notesOn.forEach(x => {
      this.ctx.beginPath();
      this.ctx.arc(200, this.getMidiNoteVerticalPos(x), 14, 0, 2 * Math.PI);
      this.ctx.stroke();
    })
    this.ctx.strokeStyle = '';
    requestAnimationFrame(this.drawFrame.bind(this));
  }

  ngAfterViewInit() {
    this.ctx = this.canvas.nativeElement.getContext('2d');
    requestAnimationFrame(this.drawFrame.bind(this));
  }

  ngOnInit() {
    if (navigator.requestMIDIAccess) {
      this.supportsMidi = true;
      this.imgStaff = new Image();
      this.imgStaff.src = 'assets/Staff.png';
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

  getMidiNoteVerticalPos(midiSignal: number): number {
    let notePos = this.getMidiRealNote(midiSignal);
    notePos *= 20;
    // Bass clef
    if (midiSignal < 60) {
      return 913 - notePos;
    }
    // Treble clef
    else {
      return 845 - notePos;
    }
  }

  getMidiRealNote(midiSignal: number): number {
    let note = midiSignal % 12;
    const octave = Math.floor(midiSignal / 12) - 1;
    let notePos = 0;
    switch (note) {
      case 0:
        notePos = 0;
        break;
      case 1:
      case 2:
        notePos = 1;
        break;
      case 3:
      case 4:
        notePos = 2;
        break;
      case 5:
        notePos = 3;
        break;
      case 6:
      case 7:
        notePos = 4;
        break;
      case 8:
      case 9:
        notePos = 5;
        break;
      case 10:
      case 11:
        notePos = 6;
        break;
    }
    return octave * 7 + notePos;
  }

  getNoteName(note: number): string {
    let ret = "";
    switch (note % 7) {
      case 0:
        ret = "C";
        break;
      case 1:
        ret = "D";
        break;
      case 2:
        ret = "E";
        break;
      case 3:
        ret = "F";
        break;
      case 4:
        ret = "G";
        break;
      case 5:
        ret = "A";
        break;
      case 6:
        ret = "B";
        break;
    }
    ret += String(Math.floor(note / 7));
    return ret;
  }

  getMidiNoteFrequency(note: number): number {
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
      this.synth.volume.value = -20;
    }
    this.inputs[index].onmidimessage = (message => {
      this.zone.run(() => {
        switch (message.data[0] & 0xF0) {
          case 0x90:
            if (message.data[2] != 0) {
              this.synth.triggerAttack(this.getMidiNoteFrequency(message.data[1]), Tone.now());
              this.notesOn.push(message.data[1]);
              console.log(this.getNoteName(this.getMidiRealNote(message.data[1])));
            }
            break;
          case 0x80:
            this.synth.triggerRelease(this.getMidiNoteFrequency(message.data[1]), Tone.now());
            this.notesOn = this.notesOn.filter(x => x != message.data[1]);
            break;
          default:
            break;
        }
      });
    });
  }
}
