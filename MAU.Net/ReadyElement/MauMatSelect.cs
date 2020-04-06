﻿using MAU.Core;
using MAU.Attributes;
using Newtonsoft.Json.Linq;
using System;
using System.Collections.Generic;
using System.Text;
using System.Threading.Tasks;
using static MAU.Attributes.MauProperty;
using static MAU.Events.MauEventHandlers;
using static MAU.Attributes.MauMethod;

namespace MAU.ReadyElement
{
	public class MauMatSelect : MauElement
	{
		#region [ Mau Events ]

		[MauEvent("openedChange")]
		public event MauEventHandler OpenedChange;

		[MauEvent("selectionChange")]
		public event MauEventHandler SelectionChange;

		// [MauEvent("valueChange")]
		// protected event MauEventHandler ValueChange;

		#endregion

		#region [ Mau Variable ]

		[MauVariable]
		public List<string> Options { get; private set; }

		#endregion

		#region [ Mau Properties ]

		[MauProperty("disableOptionCentering", MauPropertyType.ComponentProperty)]
		public bool DisableOptionCentering { get; set; }

		[MauProperty("disableRipple", MauPropertyType.ComponentProperty)]
		public bool DisableRipple { get; set; }

		[MauProperty("disabled", MauPropertyType.ComponentProperty)]
		public bool Disabled { get; set; }

		[MauProperty("id", MauPropertyType.ComponentProperty)]
		public string Id { get; set; }

		[MauProperty("multiple", MauPropertyType.ComponentProperty)]
		public bool Multiple { get; set; }

		[MauProperty("placeholder", MauPropertyType.ComponentProperty)]
		public string Placeholder { get; set; }

		[MauProperty("required", MauPropertyType.ComponentProperty)]
		public bool Required { get; set; }

		[MauProperty("typeaheadDebounceInterval", MauPropertyType.ComponentProperty)]
		public long TypeaheadDebounceInterval { get; set; }

		[MauProperty("value", MauPropertyType.ComponentProperty)]
		public string SelectedOption { get; private set; }

		[MauProperty("empty", MauPropertyType.ComponentProperty)]
		public bool Empty { get; set; }

		[MauProperty("focused", MauPropertyType.ComponentProperty)]
		public bool Focused { get; set; }

		[MauProperty("panelOpen", MauPropertyType.ComponentProperty)]
		public bool PanelOpen { get; set; }

		#endregion

		#region [ Mau Methods ]

		[MauMethod("close", MauMethodType.ComponentMethod)]
		public void Close() { }

		[MauMethod("focus", MauMethodType.ComponentMethod)]
		public void Focus() { }

		[MauMethod("open", MauMethodType.ComponentMethod)]
		public void Open() { }

		[MauMethod("toggle", MauMethodType.ComponentMethod)]
		public void Toggle() { }

		#endregion

		public MauMatSelect(MauComponent parentComponent, string mauId) : base(parentComponent, mauId)
		{
			Options = new List<string>();
		}

		#region [ Options Controlling ]

		public void UpdateOptions()
		{
			MauVariable.UpdateVar(this, nameof(Options));
		}
		public bool SetOption(string newOption)
		{
			if (!Options.Contains(newOption))
				return false;

			SelectedOption = newOption;
			return true;
		}
		public bool SetOption(int newOptionIndex)
		{
			if (Options.Count >= newOptionIndex)
				return false;

			SelectedOption = Options[newOptionIndex];
			return true;
		}

		#endregion
	}
}
