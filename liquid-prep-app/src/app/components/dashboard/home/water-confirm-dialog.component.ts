import {Component, Inject, OnInit} from '@angular/core';
import {Crop} from '../../../models/Crop';
import {MAT_DIALOG_DATA} from '@angular/material/dialog';

@Component({
  selector: 'app-water-confirm-dialog',
  template: `
    <h1>Confirm Irrigation Status</h1>
    <p>
      Would you like to mark {{ data.crop.cropName }} as watered?
      <br />
      <br />
      The updated task will then appear in the "Recently Watered" list
    </p>
    <div class="dialog-buttons">
      <button mat-button mat-dialog-close >Close</button>
      <button mat-button [mat-dialog-close]="'confirm'" >Yes</button>
    </div>
  `,
  styles: [
    `
      .dialog-buttons {
        display: flex;
        justify-content: right;
        color: blue;
      }
    `
  ]
})
export class WaterConfirmDialogComponent implements OnInit {

  constructor(@Inject(MAT_DIALOG_DATA) public data: { crop: Crop }) { }

  ngOnInit(): void {
  }

}
