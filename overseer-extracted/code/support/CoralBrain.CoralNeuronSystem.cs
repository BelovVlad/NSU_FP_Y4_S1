using System.Collections.Generic;
using RWCustom;
using UnityEngine;

namespace CoralBrain;

public class CoralNeuronSystem : UpdatableAndDeletable, INotifyWhenRoomIsReady
{
	public List<CoralStem> stems;

	public List<CoralCircuit> circuits;

	public List<CoralNeuron> neurons;

	public List<WallMycelia> wallMycelia;

	public List<Mycelium> mycelia;

	public Vector2 wind;

	public int age;

	public int notViewedCounter;

	public bool Frozen
	{
		get
		{
			if (age > 300)
			{
				return notViewedCounter > 40;
			}
			return false;
		}
	}

	public CoralNeuronSystem()
	{
		wind = Custom.RNV() * Random.value;
		mycelia = new List<Mycelium>();
	}

	public override void Update(bool eu)
	{
		base.Update(eu);
		wind += Custom.RNV() * (0.2f * Random.value);
		wind = Vector2.ClampMagnitude(wind, 1f);
		age++;
		if (room.BeingViewed)
		{
			notViewedCounter = 0;
		}
		else
		{
			notViewedCounter++;
		}
	}

	public void AIMapReady()
	{
		neurons = new List<CoralNeuron>();
		this.wallMycelia = new List<WallMycelia>();
		List<PlacedObject> list = new List<PlacedObject>();
		List<PlacedObject> list2 = new List<PlacedObject>();
		List<PlacedObject> list3 = new List<PlacedObject>();
		for (int i = 0; i < room.roomSettings.placedObjects.Count; i++)
		{
			if (room.roomSettings.placedObjects[i].active)
			{
				if (room.roomSettings.placedObjects[i].type == PlacedObject.Type.CoralStem || room.roomSettings.placedObjects[i].type == PlacedObject.Type.CoralStemWithNeurons)
				{
					list.Add(room.roomSettings.placedObjects[i]);
				}
				else if (room.roomSettings.placedObjects[i].type == PlacedObject.Type.CoralCircuit)
				{
					list2.Add(room.roomSettings.placedObjects[i]);
				}
				else if (room.roomSettings.placedObjects[i].type == PlacedObject.Type.WallMycelia)
				{
					list3.Add(room.roomSettings.placedObjects[i]);
				}
				else if (room.roomSettings.placedObjects[i].type == PlacedObject.Type.CoralNeuron)
				{
					CoralNeuron coralNeuron = new CoralNeuron(this, room, (room.roomSettings.placedObjects[i].data as PlacedObject.ResizableObjectData).handlePos.magnitude, room.roomSettings.placedObjects[i].pos, room.roomSettings.placedObjects[i].pos + (room.roomSettings.placedObjects[i].data as PlacedObject.ResizableObjectData).handlePos);
					room.AddObject(coralNeuron);
					neurons.Add(coralNeuron);
				}
			}
		}
		stems = new List<CoralStem>();
		circuits = new List<CoralCircuit>();
		if ((float)list3.Count > 0f)
		{
			WallMycelia wallMycelia = new WallMycelia(this, list3);
			room.AddObject(wallMycelia);
			this.wallMycelia.Add(wallMycelia);
		}
		while (list2.Count > 0)
		{
			List<PlacedObject> list4 = new List<PlacedObject> { list2[0] };
			list2.RemoveAt(0);
			bool flag;
			do
			{
				flag = true;
				for (int j = 0; j < list4.Count; j++)
				{
					for (int num = list2.Count - 1; num >= 0; num--)
					{
						if (Custom.DistLess(list4[j].pos, list2[num].pos, (list4[j].data as PlacedObject.ResizableObjectData).Rad + (list2[num].data as PlacedObject.ResizableObjectData).Rad))
						{
							list4.Add(list2[num]);
							list2.RemoveAt(num);
							flag = false;
							break;
						}
					}
				}
			}
			while (!flag);
			circuits.Add(new CoralCircuit(this, list4));
			room.AddObject(circuits[circuits.Count - 1]);
		}
		for (int k = 0; k < list.Count; k++)
		{
			stems.Add(new CoralStem(this, list[k].pos, (list[k].data as PlacedObject.ResizableObjectData).Rad, room, list[k].type == PlacedObject.Type.CoralStemWithNeurons));
		}
		if (room.roomSettings.GetEffectAmount(RoomSettings.RoomEffect.Type.SSSwarmers) > 0f)
		{
			PlaceSwarmers();
		}
	}

	public void PlaceSwarmers()
	{
		bool dark = room.roomSettings.Palette == 24 || (room.roomSettings.fadePalette != null && room.roomSettings.fadePalette.palette == 24);
		IntVector2[] accessableTiles = room.aimap.CreatureSpecificAImap(StaticWorld.GetCreatureTemplate(CreatureTemplate.Type.Fly)).accessableTiles;
		int num = (int)((float)accessableTiles.Length * 0.05f * room.roomSettings.GetEffectAmount(RoomSettings.RoomEffect.Type.SSSwarmers));
		List<IntVector2> list = new List<IntVector2>();
		for (int i = 0; i < num; i++)
		{
			if (accessableTiles.Length == 0)
			{
				break;
			}
			list.Add(accessableTiles[Random.Range(0, accessableTiles.Length)]);
		}
		SSOracleSwarmer.Behavior behavior = default(SSOracleSwarmer.Behavior);
		for (int j = 0; j < list.Count; j++)
		{
			SSOracleSwarmer sSOracleSwarmer = new SSOracleSwarmer(new AbstractPhysicalObject(room.world, AbstractPhysicalObject.AbstractObjectType.SSOracleSwarmer, null, room.GetWorldCoordinate(list[j]), room.game.GetNewID()), room.world);
			sSOracleSwarmer.abstractPhysicalObject.destroyOnAbstraction = true;
			sSOracleSwarmer.firstChunk.HardSetPosition(room.MiddleOfTile(list[j]));
			sSOracleSwarmer.system = this;
			sSOracleSwarmer.waitToFindOthers = j;
			sSOracleSwarmer.dark = dark;
			if (behavior == default(SSOracleSwarmer.Behavior))
			{
				behavior = sSOracleSwarmer.currentBehavior;
			}
			else
			{
				sSOracleSwarmer.currentBehavior = behavior;
			}
			if (ModManager.MSC)
			{
				room.abstractRoom.AddEntity(sSOracleSwarmer.abstractPhysicalObject);
			}
			room.AddObject(sSOracleSwarmer);
			sSOracleSwarmer.NewRoom(room);
		}
	}

	public void ShortcutsReady()
	{
	}
}
